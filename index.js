var QQ = require('wqq')
var _ = require("lodash")
var request = require('request')
var co = require('co');
var routeMap = require("route-map");
var nedb = require("nedb"),
    db = {};
db.account = new nedb({
    filename: 'db/account.db',
    autoload: true
});
var clc = require('cli-color');

var gray = clc.blackBright
var red = clc.red
var green = clc.green
var yellow = clc.yellow
var cyan = clc.cyan
var magenta = clc.magenta

var logger = require('tracer').colorConsole({
    format: process.pid + red(" [{{timestamp}}]") + " <{{title}}> {{message}} (in {{file}}:{{line}})",
    dateformat: "HH:MM:ss"
});

function getVcode(ctx) {
    var deferred = Promise.defer()
    ctx.qq.getVcode(ctx.uin, function(err, buffer) {
        if (!err) {
            deferred.resolve(buffer);
        } else {
            deferred.reject(err);
        }
    });
    return deferred.promise
}

function login(ctx) {
    var deferred = Promise.defer()
    ctx.qq.login(ctx.pw, ctx.vcode || '', function(err, nick) {
        if (!err) {
            deferred.resolve(nick);
        } else {
            deferred.reject(err);
        };
    })
    return deferred.promise
}

//2944779171 tyy0102.1203
//2652371804 wwx0102.1203
//db.account.insert([{ uin: 2944779171, pw: "tyy0102.1203" }, { uin: 2652371804,  pw:"wwx0102.1203"}], function (err) {
// err is a 'uniqueViolated' error
// The database was not modified
//});
var cheak_group_list = [467644181, 174069009, 109565842];

var match = routeMap({
    '/people/:name': user,
    '/fruits/:fruit': fruit,
    '/fruits/:fruit/:page': fruitPage,
    '/:with.:dots,:and;:commas': dots,
    '/': home
});

function home() {}

function user() {}

function fruit() {}

function fruitPage() {}

function dots() {}

var routematch = routeMap({
    '/people/:name': function(o) {
        console.log(o.params.name);
    },
    '/group/add/:gid': function(o) {
        console.log(o.params);
        cheak_group_list.push(o.params.gid)
        console.log(cheak_group_list);
        return "增加 " + o.params.gid + " 成功"
    },
    '/group/reduce/:gid': function(o) {
        console.log(o.params);
        _.remove(cheak_group_list, o.params.gid)
        console.log(cheak_group_list);
        return "减少 " + o.params.gid + " 成功"
    }
})

db.account.find({}, function(err, docs) {
    if (err) {
        return logger.error(err);
    };
    _.forEach(docs, function(n, key) {
        var ctx = {};
        ctx.qq = new QQ();
        ctx.uin = n.uin;
        ctx.pw = n.pw;
        ctx.itpk = {
            API_Key: "d4112c78286693bea7b034f3b4d7f337",
            API_Secret: "7602q9za2ctg"
        }
        co(function*() {
            var buffer = yield getVcode(ctx);
            if (buffer) {
                logger.error("需要验证码");
            };
            var nick = yield login(ctx);
            logger.info("%s 登陆成功", nick);

            /*ctx.qq._getRecentList(function(e, d) {
                _.forEach(d.result, function(n, key) {
                    switch (n.type) {
                        case 0:
                            ctx.qq.sendBuddyMsg(n.uin, ["皆さん おはよう"], function(e, d) {
                                logger.log(n.uin, d);
                            });
                            break;
                        case 1:
                            ctx.qq.sendGroupMsg(n.uin, ["皆さん おはよう"], function(e, d) {
                                logger.log(n.uin, d);
                            });
                            break;
                        case 2:
                            ctx.qq.sendDiscuMsg(n.uin, ["皆さん おはよう"], function(e, d) {
                                logger.log(n.uin, d);
                            });
                            break;
                        default:
                    }
                })
            })*/

            ctx.qq.on('disconnect', function() {
                exit()
            })
            ctx.qq.on('message', function(m) {
                message_hander(ctx, m);
            })
            ctx.qq.startPoll()
        }).catch(function(err) {
            logger.error(err.stack);
        });
    })
});

function message_hander(ctx, m) {
    var nick = m.send_gnick || m.send_mark || m.send_nick
    var pollType = m['poll_type'];
    var context = m.file ? gray('::::' + m.file + '::::') : gray(m.content.map(function(chunk) {
        if (typeof chunk === 'string') {
            return chunk.replace(/\s*[\r\n]+\s*/g, '↵ ')
        }
        if (chunk[0] === 'face') return mapFace(chunk[1])
        if (chunk[0] === 'cface') return '::' + chunk[1] + '::'
    }).join(' ').trim() || '-');
    var str = _.compact([
        gray(m.time ? timeStr(m.time * 1000) : m.timestr), ctx.qq.store.nick,
        m.group_name ? cyan(m.group_name.trim()) : m.discu_name ? cyan(m.discu_name.trim()) : gray('私聊'),
        nick ? magenta(nick.trim()) : m.anonymous ? gray('匿名') :
        m.send_account ? gray(('' + m.send_account).trim()) : gray('-'),
        context
    ]).join('  ')
    switch (pollType) {
        case "message":
            var from = m['from_uin'];
            cmd(ctx, context, function(e, b) {
                if (e) {
                    itpkApi(ctx, context, function(e, d) {
                        ctx.qq.sendBuddyMsg(from, [d], function(e, d) {
                            logger.debug(str + "  Reply:", d);
                        });
                    })
                };
                ctx.qq.sendBuddyMsg(from, [b], function(e, d) {
                    logger.debug(str + "  Reply:", d);
                });
            })
            break;
        case "group_message":
            var from = m['from_uin'];
            if (/groupRm|关闭机器人/.test(context)) {
                cheak_group_list.splice(_.indexOf(cheak_group_list, m['info_seq']), 1)
                ctx.qq.sendGroupMsg(from, ["移除群 " + m['from_uin'] + " 成功"], function(e, d) {
                    logger.debug(str + "  Reply:", d);
                });
            } else if (/groupAdd|开启机器人/.test(context)) {
                cheak_group_list.push(m['info_seq'])
                ctx.qq.sendGroupMsg(from, ["增加群 " + m['from_uin'] + " 成功"], function(e, d) {
                    logger.debug(str + "  Reply:", d);
                });
            } else if (inArray(m['info_seq'], cheak_group_list)) {
                itpkApi(ctx, context, function(e, d) {
                    ctx.qq.sendGroupMsg(from, [d], function(e, d) {
                        logger.debug(str + "  Reply:", d);
                    });
                })
            }
            break;
        case "discu_message":
            var from = m['from_uin'];
            itpkApi(ctx, context, function(e, d) {
                ctx.qq.sendDiscuMsg(from, [d], function(e, d) {
                    logger.debug(str + "  Reply:", d);
                });
            })
            break;
        default:
            logger.debug(str);
    }
}

function cmd(ctx, str, cb) {
    var obj = match(str);
    console.log(obj);
    if (_.isObject(obj)) {
        cb(null, obj.fn(obj));
    };
    cb(1, null);
}

function itpkApi(ctx, str, cb) {
    var url = 'http://i.itpk.cn/api.php?question=' + encodeURI(str) + '&api_key=' + ctx.itpk.API_Key + '&api_secret=' + ctx.itpk.API_Secret;
    request({
        url: url,
        json: true
    }, function(e, r, d) {
        cb(e, d);
    })
};

function inArray(stringToSearch, arrayToSearch) {
    for (s = 0; s < arrayToSearch.length; s++) {
        var thisEntry = arrayToSearch[s].toString();
        if (thisEntry == stringToSearch) {
            return true;
        }
    }
    return false;

}

function mapFace(n) {
    return ':' + n + ':'
}

function timeStr(t) {
    return new Date(t).toString().match(/\d+:\d+/)[0]
}

function exit() {
    //console.log(clc.bol(-1))
    process.exit()
}
