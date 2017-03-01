var TimeCalculator = (function () {
    function TimeCalculator(bot, momentNow) {
        this.open_at = bot._open_at;
        this.open_duration = bot._open_duration;
        this.momentNow = momentNow;
    }
    TimeCalculator.prototype.getRemainMin = function () {
        var remain = this.momentNow.minute() - (this.open_at + this.open_duration);
        if(remain < 0){
            remain += 60;
        }
        return remain;
    };

    TimeCalculator.prototype.getNextOpen = function (fmt) {
        var end = this.open_at + this.open_duration;
        if(this.momentNow.minute() > end){
            return this.momentNow.add(1, "h").minute(this.open_at);
        }else{
            return this.momentNow.minute(this.open_at).format(fmt);
        }
    };

    TimeCalculator.prototype.getClose = function (fmt) {
        return this.momentNow.minute(this.open_at).add(this.open_duration, "m").format(fmt);
    };

    TimeCalculator.prototype.getSpan = function () {
        return this.open_at + " ~ " + (this.open_at + this.open_duration);
    };

    return TimeCalculator;
}());


function describe_en(msgType, bot, momentNow){
    var msg = "";
    var tc = new TimeCalculator(bot, momentNow);
    switch(msgType.toUpperCase()){
        case "ON":
            msg = "Ok! I'll manage this channel! Only Between " + tc.getSpan() + " minute communication is allowed.\n";
            msg += "If you want to remove me, please send me `off`."
            break;
        case "OFF":
            msg = "Bye Bye! I'll no longer manage this channel. If you want to invite me, please send me `on`.";
            break;
        case "HELP":
            msg = "I sweep messages between " + tc.getSpan() + " minute.\n";
            msg += "If you want to activate/deactivate me, send `on`/`off` to me.";
            break;
        case "STATE":
            if(bot._open){
                msg = "The Channel is opening. Let's have a break! (we have " + tc.getRemainMin() + "min).";
            }else{
                var next_open
                msg = "The Channel is closing. `Don't disturb everyone's concentration!` Next open is " + tc.getNextOpen("H:mm") + ".";
            }
            break;
        case "OPEN":
            msg = "Now channel open! Let's have a break till " + tc.getClose("H:mm") + ".";
            break;
        case "CLOSE":
            msg = "Now channel closed. Let's concentrate " + (60 - bot._open_duration) + "min!";
            break;
        case "CAUTION":
            msg = "Now is concentration time. You have to wait till " + tc.getNextOpen("H:mm") + " or send me the message that you want to notify.\n";
            msg += ">ex: #general I want to talk about the customer support!\n"
            msg += "(need channel name before or after the message). I'll notify your message as soon as the channel opened."
            break;
        case "STORE_FAILED":
            msg = "The channel is not specified. Please describe channel name by #."
            break;
    }
    return msg
}

function describe_ja(msgType, bot, momentNow){
    var msg = "";
    var tc = new TimeCalculator(bot, momentNow);
    switch(msgType.toUpperCase()){
        case "ON":
            msg = "今から本チャンネルは吾輩の管理下であります。諸君の発言は " + tc.getSpan() + " の間だけ許可されます。\n";
            msg += "吾輩を撤退させたい場合は、`off`と送ってくれたまえ。";
            break;
        case "OFF":
            msg = "さらばだ諸君！また吾輩に会いたいなら、`on`と送ってくれたまえ";
            break;
        case "HELP":
            msg = "吾輩は " + tc.getSpan() + "の間以外の発言を掃討するのが任務であります。\n";
            msg += "諸君が吾輩を参加/撤退させたいなら、`on`/`off` を吾輩に送ってくれたまえ。";
            break;
        case "STATE":
            if(bot._open){
                msg = "本チャンネルは今解放されておる。ゆっくりくつろぐといい(残り " + tc.getRemainMin() + "分)。";
            }else{
                var next_open
                msg = "本チャンネルは現在閉鎖されておる。`発言は禁止だ。仕事に戻りたまえ` 次の休憩時間は" + tc.getNextOpen("H:mm") + "からだ。";
            }
            break;
        case "OPEN":
            msg = "チャンネルは今解放されたぞ！" + tc.getClose("H:mm") + "までゆっくりくつろいでくれたまえ。";
            break;
        case "CLOSE":
            msg = "本チャネルは現時刻をもって閉鎖された。今から" + (60 - bot._open_duration) + "分は仕事に集中モードだ！";
            break;
        case "CAUTION":
            msg = "現在は集中タイムであり、チャンネルでの発言は禁止されておる。貴君は " + tc.getNextOpen("H:mm") + "まで待つか、吾輩に言伝を頼むことができる。\n";
            msg += ">ex: #general お客様からの問い合わせについて話したい!\n"
            msg += "(チャンネル名を含めてくれたまえ。預かった言伝は、チャンネルがオープンしたらすぐに吾輩がしらせよう)."
            break;
        case "STORE_FAILED":
            msg = "チャンネル名が指定されていません。#をつけてチャンネルを指定してください。"
            break;
    }
    return msg
}

function get(lang){
    if(lang == "ja"){
        return describe_ja;
    }else{
        return describe_en;
    }
}

module.exports = get;
