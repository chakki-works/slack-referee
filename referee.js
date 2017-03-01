if (!process.env.bot_token || !process.env.api_token) {
    console.log("Error: Specify token in environment");
    process.exit(1);
}

var Botkit = require("botkit/lib/Botkit.js");
var Moment = require("moment");
var Request = require("request");
var Describer = require("./describer.js")
var os = require("os");

var controller = Botkit.slackbot({
    debug: false,
    json_file_store: "./bot_memory"
});

var bot = controller.spawn({
    token: process.env.bot_token
}).startRTM();

//hidden values
bot._api_token = process.env.api_token || "";
bot._open_at = parseInt(process.env.open_at) || 50;
bot._open_duration = parseInt(process.env.open_duration) || 10;
bot._open = false;
bot._active_hours = process.env.active_hours || "9-18";
bot._describer = Describer(process.env.lang || "en");

//Global variable
var Interval = 1000;
var Offset = 0; //timezone offset
var FeatureOn = ["hello", "hi", "on"];
var FeatureOff = ["bye", "off"];

function datetime(){
    return Moment().utcOffset(Offset);
}

function switchState(bot, turnOn){
    if(turnOn){
        bot._open = true;
        return bot._describer("OPEN", bot, datetime());
    }else{
        bot._open = false;
        return bot._describer("CLOSE", bot, datetime());
    }
}

bot.api.users.list({}, function(err, resp){
    if(!resp.ok){
        console.log("Error occurred when getting the users and its time zone.");
        return 0;
    }
    var users = resp.members;
    var user = null;
    for(var i = 0; i < users.length; i++){
        if(users[i].deleted || users[i].is_restricted || users[i].is_ultra_restricted || users[i].is_bot || users[i].id == "USLACKBOT" ){
            continue;
        }
        user = users[i];
        break;
    }

    Offset = user.tz_offset / 3600;  // slack tz_offset is second
    console.log("Timezone: " + user.tz_label + " its offset: " + Offset + "hours");
    console.log(datetime().format());
    main();
})

function main(){
    var watch = setInterval(function(){
        begin_end = bot._active_hours.split("-").map(function(h){
            parseInt(h.trim());
        });
        if(datetime().hour() < begin_end[0] || begin_end[1] < datetime().hour()){
            return 0;
        }
        //var minuteNow = datetime().minute();
        var minuteNow = datetime().second(); //for debug
        var duration = minuteNow - bot._open_at;
        var notification = "";
        var state = "";
        
        if(minuteNow == bot._open_at){
            notification = switchState(bot, true);
        }else if(0 < duration && duration < bot._open_duration){
            state = "opening: ";
        }else{
            if(bot._open){
                notification = switchState(bot, false);
            }else{
                state = "closing: ";
            }
        }

        if(notification == ""){
            console.log(state + minuteNow);
            return 0;
        }
        controller.storage.channels.all(function(err, all_channels){
            if(!all_channels){
                return 0;
            }
            all_channels.forEach(function(c){
                bot.say({
                    text: notification,
                    channel: c.id
                });
                if(!bot._open) return 0;
                controller.storage.channels.get(c.id, function(err, data){
                    data.msgs.forEach(function(m){
                        bot.say({ text: m, channel: c.id});
                    });
                    resetChannelMsg(c.id, function(){});
                });
            });
        });

    }, Interval);
}

controller.hears(FeatureOn, "direct_mention,mention", function(bot, message) {
    resetChannelMsg(message.channel, function(){
        bot.reply(message, bot._describer("ON", bot, datetime()));
    })
});

controller.hears(FeatureOff, "direct_mention,mention", function(bot, message) {
    controller.storage.channels.delete(message.channel, function(err){
        bot.reply(message, bot._describer("OFF", bot, datetime()));
    });
});

controller.on("direct_message", function(bot, message) {
    var tokens = message.text.split(" ");
    var text = message.text;
    var matches = text.match(/<#[A-Z0-9]+\|.+>/g) || [];
    var channel = ""
    if(matches.length > 0){
        channel = matches[0].split("|")[0].replace("<#", "");
        text = text.replace(matches[0], "").trim();
    }
    if(channel != ""){
        bot.api.users.info({user: message.user}, function(err, resp){
            var name = resp.user.name;
            text = "`" + name + "`\n" + text;
            addMessage(channel, text, function(){
                bot.api.reactions.add({
                    timestamp: message.ts,
                    channel: message.channel,
                    name: "memo",
                });
            });
        });
    }else{
        bot.reply(message, bot._describer("STORE_FAILED", bot, datetime()));
    }
});

controller.on("ambient", function(bot, message) {
    if(FeatureOn.concat(FeatureOff).indexOf(message.text) > -1){
        return 0;
    }

    Request.post("https://slack.com/api/chat.delete",{
        form:{
            token: bot._api_token,
            ts: message.ts,
            channel: message.channel
        }
    }, function(err, resp, body){
        bot.api.im.open({user: message.user}, function(err, resp){
            var c_id = resp.channel.id;
            bot.say({
                text: bot._describer("CAUTION", bot, datetime()),
                channel: c_id
            })
        });
    })
})

function resetChannelMsg(channelId, callback){
    controller.storage.channels.delete(channelId, function(err) {
        controller.storage.channels.save({id: channelId, active: true, msgs: []}, function(err) {
            callback();
        });
    });
}

function addMessage(channelId, msg, callback){
    controller.storage.channels.get(channelId, function(err, data) {
        data.msgs.push(msg);
        controller.storage.channels.save(data, function(err) {
            callback();
        });
    });
}
