/*
 * 201603xx xia 0.1版
 * 201606xx xia 0.2版
 * 20161xxx xia 0.3版 修改为可异步请求数据
 * 20161013 xia 引擎与modulebase无关；容器 mcontainer依然使用；（可以修改容器方式？？？）
 * 20161015 xia tmpt-m使用中，容器内模块识别
 * 20161015 xia 关于tmpt的样式未涉及到modulebase 与 tmpt-m 。modulebase的初始目的是为了后台效果显示使用；
 * 20161017 xia 添加延迟模块
 * 20161205 xia 添加模块局部渲染；添加私有parameter， 访问方法：Tmpt.getParameter(tmptId)；添加attr:tmpt-show,功能与tmpt-display类试，不同在于速度快些，与eachone3判断是否执行;
 * 20161206 xia 删除引擎中类class:content,只使用tmpt-load； 修改$tmptid,值去引号，使得值为tmptId,字符串类型;需注意部分模块可能出错；添加apiUrl配置，避免引擎对API_URL依赖；
 * 20161219 xia 将引擎改为非静态对象；
 * 20161220 xia 将简化build,mcontainer改为tmpt-container，作用为:作为容器组装多个tmpt形成一个大模块,有待进一步改善；组装形式可分为两种，一种是后台给的数据组装，这时就不需要这个类。另一种就是模块组装，使用该类多次请求。
 * 20161226 xia 0.4版 将引擎封装成对象,大修改获取模块方式，从字符串强转$，改为$.clone;
 * 20161228 xia 0.41 改变Tmpt初始化方式，提高响应时间;
 * 20160105 xia 0.42 修改页面引擎对象名称由$R改为$dom,修改渲染方法名称为$R,Tmpt为兼容方式，可以兼容前两个作用；
 * 20160106 xia 0.43 添加getData(tmptId)接口，建议少在html上存储临时变量，可以利用该接口。（因为只读，不会被污染，可以考虑扩展双向绑定,但可能导致安全问题）
 * 20160111 xia 0.44 添加渲染进度改变事件
 * 20160113 lang 0.45 添加图片渲染失败替换
 * 20160124 lang 0.46 添加数据递归呈现不同html
 * 20160125 xia 0.47 添加ajax失败显示图片（可以局部404）
 * 20160209 xia 0.48 添加tmpt-html
 * 20160214 xia 0.49 修改api数据验证与处理(200 404 500 401等)
 * 20160214 xia 0.50 添加渲染内存模块功能 访问方法 $dom.virtual({}).complete(function(){}); 获取内存模块 $dom.find(selector);
 * 20160226 xia 0.51 添加tmpt-value, 用于修饰input,从$dom内部保存input提交的值,区别于parameter(这个是提交的过滤条件）而这个是需要添加的数据
 */
;
//tmpt-m
var 无数据 = null;//解决eval("无数据")bug
var crossDomain = false;
var origin = document.location.protocol + "//" + document.location.host;
if (!API_URL) {
    var API_URL = "";
}
if (origin != API_URL.substring(0, API_URL.lastIndexOf('/'))) {
    jQuery.support.cors = true;
    crossDomain = true;
    $.ajaxSetup({
        contentType: "application/x-www-form-urlencoded;charset=UTF-8",
        xhrFields: {
            withCredentials: true
        }
    });
}
function GetQueryString(name) {
    var reg = new RegExp("(^|&)" + name + "=([^&]*)(&|$)", "i");
    var r = window.location.search.substr(1).match(reg);
    if (r !== null) {
        return unescape(r[2]);
    }
    return null;
}
function getUrlTwo() {
    var r = window.location.toString();
    var s = r.substring(r.lastIndexOf("/", r.lastIndexOf("/") - 1) + 1, r.lastIndexOf("/"));
    if (s !== null) {
        return unescape(s);
    }
    return null;
}

$.extend({
    tpajax: function (options) {

        var option = $.extend({}, {
            success: function (data) { },
            beforeSend: function (data) { },
            loadFlag: false
        }, options);
        var successfun = option.success;

        option.beforeSend = function (xhr) {
            ////if (crossDomain) {
            ////    xhr.setRequestHeader("Origin", origin);
            ////}
            options.beforeSend && options.beforeSend(xhr);
        };
        option.error = function (data) {
            options.error && options.error(data);
        };
        option.success = function (data) {
            if (!data) {
                alert("无法获取数据");
                return false;
            } else if (!!data.Type && data.Type == 401) {
                document.location = "/" + data.Message + "?/admin";
                return;
            } else {
                successfun(data);
            }
        };
        option.complete = function (data) {
            options.complete && options.complete(data);
        };
        return $.ajax(option);
    }
});

/**
 * 
 * @param {type} configoptions
 * @returns {type} 
 */
function TmptJs(configoptions) {
    var _this = this;

    var info = {
        name: "tmptJs",
        version: 0.43
    };
    //初始化参数
    var _setting = $.extend({
        openTag: "{{",
        clossTag: "}}",
        errorUrl: "/common/AddFrontError",
        loginUrl: "/Home/Login.html",
        apiUrl: "",
        containerSelector: ".tmpt-container",
        noImage: "/Content/V3/images/notFound.jpeg",
        loadErrorImage: "/Content/images/modulebaseload.gif"
    }, configoptions);

    //事件
    var _event = {
        // 事件触发器，暂时不工作，还未兼容当前版本；可以考虑改变当前事件机制与结构 考虑0.5version;
        trigger: function (event, params) {
            this[arguments[0]] && this[arguments[0]](arguments);
        },
        //渲染完成事件
        ready: {
            all: []
        },
        //请求无数据错误事件
        error_0: {
            all: []
        },
        //渲染进度变化事件
        renderProcess: false,
        //触发加载模块事件
        loadmodule: {
            'default': function (id) {
                var $tas = $("#" + id);
                $.ajax({
                    url: $tas.attr("tmpt-async"),
                    type: "get",
                    async: true,
                    dataType: "html",
                    success: function (html) {
                        $tas.html(html);
                        _baseFun.init($tas);
                        $tas.show();
                    },
                    error: function (e) {
                        log("ajax-error:", e);
                    }
                });
            }
        }
    };
    //渲染数据处理方法对象
    var _renderFun = {
        get: function (obj, pro) {
            return obj[pro];
        },
        parseTime: function (time, format) {
            if (!time) {
                return "";
            }
            var value = time.replace(/[^0-9-]/ig, "");
            return new Date(parseInt(value)).format(format);
        },
        toFixed: function (data, options) {
            return data.toFixed(parseInt(options));
        },
        maxLength: function (v, len, type) {
            return v.substring(0, len) + (type || '');
        },
        count: function (arr) {  //tmpt-show="{{arr.length>1}}"
            return arr.length;
        },
        sum: function (arr, pro) {
            var sum = 0;
            arr.forEach(function (value) {
                var str = "value." + pro;
                val = eval(str) || "0";
                sum += parseInt(val);
                //  sum += value[pro];
            });
            return sum;
        },
        countif: function (arr, strif) {  //strif="s=>s.a==s.b"
            strif = strif.replace("&gt;", ">");
            var s = strif.match(/^([\w]+)=>/)[1];
            var reg = new RegExp("" + s + "\\.", "g");
            var str = strif.match(/=>(.+)/)[1].replace(reg, "value.");
            var count = 0;
            $.each(arr, function (i, value) {
                if (eval(str)) {
                    count++;
                }
            });
            return count;
        },
        compare: function (a, b) {
            return a > b;
        },
        replaceIf: function (strIf, strR) {
            try {
                if (eval(str)) {
                    return strR;
                }
            } catch (e) {
                console.log("rendFun replace error");
            }
        },
        buildHtml: function (str) {
            return str || '<div><h1>HHHHHHHHHHHHHHHHHH</h1></div>';
        },
        buildText: function (str) {
            str = str || '<div><h1>HHHHHHHHHHHHHHHHHH</h1></div>';       //{{#name}}   {{buildText(name)}}
            return _baseFun.htmlEncode(str);
        },
        exit: function (value) {
            if ($.isArray(value)) {
                return value.length > 0;
            }
            else {
                return (!!value) || value === 0;
            }
        },
        notExit: function (value) {
            !_renderFun.exit(value);
        },
        isNull: function (value) {
            return !!value;
        },
        "default": function (value, adefault) {
            return value == null ? adefault : value || adefault; //这里是"==",使其满足null or undefined
        },
        equal: function (a, b) {
            return a == b;
        },
        firstOrDefault: function (value) {
            return value[0] || 0
        }
    };
    //内部基础方法
    var _baseFun = {
        doArrFun: function (arr) {
            for (var i = 0; i < arr.length; i++) {
                if (typeof arr[i] === "function") {
                    arr[i]();
                }
            }
        },
        allready: function (hasReady, tmptId) {
            if (hasReady) {
                //完成当前tmpt渲染;++
                _renderedNum++;
                //执行进度变化事件;
                _event.renderProcess && _event.renderProcess(_baseFun.getRenderProcess(), tmptId);

                if ($(".tmpt-m:not(.rendered)").length === 0 && _event.ready.all.length > 0) { //局部渲染不触发allReady事件；
                    //当所有module与mcontainner都渲染完成时执行，（mcontainner是否有必要？？？）
                    window.allRender && window.allRender();
                    for (var i = 0; i < _event.ready.all.length; i++) {
                        if (typeof _event.ready.all[i] === "function")
                            _event.ready.all[i]();
                    }
                    _event.ready.all = [];  ////执行完成后注销；
                    _event.renderProcess && _event.renderProcess(100, "$dom");
                }
            }
        },
        //渲染自定义样式
        styleRender: function (tmptid) {
            var tmpt = $m("#" + tmptid);
            $css = tmpt.find("[tmpt-css]");
            if ($css.length === 0) {
                return false;
            }
            else {
                $css.each(function (i, v) {
                    var strcss = $(this).attr("tmpt-css");
                    var arr = strcss.split(';');
                    var objcss = {
                    };
                    for (var x = 0; x < arr.length; x++) {
                        if (arr[x]) {
                            var a = arr[x].match(/([^:]+):([^:]+)/);
                            if (a.length != 3) {
                                log("tmpt-css error", v);
                                continue;
                            }
                            objcss[a[1]] = a[2];
                        }
                    }
                    $(this).css(objcss);
                });
            }
        },

        //渲染特性；
        attrRender: function (tmptid) {
            var $tmpt = $m("#" + tmptid);
            $show = $tmpt.find("[tmpt-show]"); //将内部的tmpt-show做处理           
            $show.each(function (i, v) {
                var attrV = $(this).attr("tmpt-show");
                if (attrV == "true" || attrV == "!false" || attrV.toLowerCase() == "!undefined" || attrV.toLowerCase() == "!null") {
                    //
                }
                else if (attrV == "false" || attrV == "!true" || attrV.toLowerCase() == "undefined" || attrV.toLowerCase() == "null" || attrV[0] == "!") {
                    $(this).remove();
                }
                else {
                    //if (!eval(attrV)) {
                    //    $(this).remove();
                    //}
                }
                $(this).removeAttr("tmpt-show");
            });
            //只适应input，赋值，可以考虑数据绑定之类的功能
            var $tvalue = $tmpt.find('[tmpt-value]');
            $tvalue.each(function (i, v) {
                v.value = $(this).attr('tmpt-value');
            });

            //// 加载模块（不同于异步加载数据，虽然数据也是异步加载）等同于延迟为0的延迟模块
            var $async = $tmpt.find("[tmpt-inner]");
            $async.each(function (i, v) {
                var $tas = $(this);
                $.ajax({
                    url: $tas.attr("tmpt-inner"),
                    type: "get",
                    async: true,
                    dataType: "html",
                    success: function (html) {
                        $tas.html(html);
                        _baseFun.init($tas);
                        $tas.show();
                    },
                    error: function (e) {
                        log("ajax-error:", e);
                    }
                });
            });
            //// 延迟加载模块；
            var $delay = $tmpt.find("[tmpt-inner-delay]");
            $delay.each(function (i, v) {
                var $tas = $(this);
                var delaytime = $tas.attr("tmpt-inner-delay-time");
                if (delaytime) {
                    setTimeout(function () {
                        $.ajax({
                            url: $tas.attr("tmpt-inner-delay"),
                            type: "get",
                            async: true,
                            dataType: "html",
                            success: function (html) {
                                $tas.html(html);
                                _baseFun.init($tas);
                                $tas.show();
                            },
                            error: function (e) {
                                log("ajax-error:", e);
                            }
                        });
                    }, delaytime);
                }
            });

            var $text = $tmpt.find('[tmpt-html]');
            $text.each(function (i, v) {
                v.innerHTML = $(this).attr('tmpt-html');
                $(this).removeAttr('tmpt-html');
            });

            //只能用于select标签
            var $select = $tmpt.find("[tmpt-select]");
            $select.each(function () {
                var $tas = $(this);
                var selectValue = $tas.attr("tmpt-select");
                if (selectValue) {
                    $tas.find('option').removeAttr("selected");
                    $tas.find('option[value="' + selectValue + '"]').eq(0).attr("selected", "selected");
                }
            });
            //用于图片渲染
            //if (tmptid == "培训成果") {
            //    debugger;
            //}
            var $img = $tmpt.find("[tmpt-src]");
            $img.each(function () {
                var $pic = $(this);
                var img = new Image();
                var imgsrc = $pic.attr("tmpt-src");
                img.onload = null;
                img.dycsrc = imgsrc;
                img.onload = function () {
                    $pic.removeAttr("tmpt-src");
                    $pic.attr("src", imgsrc);
                };
                img.onerror = function () {
                    $pic.removeAttr("tmpt-src");
                    var arr = imgsrc.match(/(^https?:\/\/[\w\.:]+)\//);

                    var main = (arr && arr[1]) || "";
                    $pic.attr("src", main + _setting.noImage);
                };
                img.src = imgsrc;
            });
        },

        theif: function (str) {  //str:   "a==b&((c>=3|d<1)&e!=2)|(f>4&e<='a')"
            // (                  //      "a==b&" ,"", "c>=3|d<1)&e!=2)|", "f>4&e<='a')"
            //)                   //      "a==b&" ,"" ,"c>=3|d<1", "&e!=2", "|" ,"f>4&e<='a'", ""
            var arr = str.split('|'); // a==b&c==1  d<=3
            $.each(arr, function (i, val) {
                $.each(val.split('&'), function (j, v) {
                    if (v.indexOf("==") > 0) {
                        var s = v.split("==");
                        s[0] = s[1];
                    }
                    else if (v.indexOf(">=") > 0) {
                    }
                    else if (v.indexOf("<=") > 0) {
                    }
                    else if (v.indexOf(">") > 0 & v.indexOf(">=") < 0) {
                    }
                    else if (v.indexOf("<") > 0 & v.indexOf("<=") < 0) {
                    }
                });
            });
        },
        //html编码
        htmlEncode: function (str) {
            if (typeof str === "string") {
                return str.replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/"/g, '&quot;')
                    .replace(/'/g, '&apos;');
            }
            else {
                return str;
            }
        },
        //html解码
        htmlDescode: function (str) {
            if (typeof str === "string") {
                return str.replace(/&amp;/g, '&')
                    .replace(/&lt;/g, '<')
                    .replace(/&gt;/g, '>')
                    .replace(/&quot;/g, '"')
                    .replace(/&apos;/g, '\'');
            }
            else {
                return str;
            }
        },
        //渲染前 样式修改
        beginLoad: function () {
        },
        //渲染结束 样式改变
        endLoad: function (tmptid) {
            var $tmpt = $m("#" + tmptid);
            // $tmpt.not(":has(.tmpt-m)").find(".content > * , .tmpt-load > *").css({ "visibility": "visible" }); //多个not tmpt-m是防止容器渲染完成，而里面没有完成造成提前显示；
            //$tmpt.find(".content > * , .tmpt-load > *").css({ "visibility": "visible" });
            //$tmpt.find(" .content, .tmpt-load").css({ "background": "initial" });
            //$tmpt.find(".tmpt-load-hide").css({ "visibility": "visible" });
            $tmpt.find(".tmpt-load > *").css({ "visibility": "visible" });
            $tmpt.find(".tmpt-load").removeClass("tmpt-load");
            $tmpt.find(".tmpt-load-hide").removeClass("tmpt-load-hide");
            $("#" + tmptid + "[tmpt-async]").show();
        },

        replaceFun: function () {
        },

        //初始化, 正常模块初始化，即处理已经有模块内容的模块，处理数据或数据地址
        init: function ($the, data) {
            var url = "";
            var dataStr = "";
            //没有数据尝试从模块中获取
            if (typeof data === "undefined") {
                url = $the.attr("tmpt-url");
                dataStr = $the.attr("tmpt-data");
            }
            else {
                //如果是数据请求地址
                if (typeof data === "string") {
                    url = data;
                }
                else if (typeof data === "object") {
                    data = data;
                }
            }
            //没有tmptId则自动生成
            var id = $the.prop("id");
            if (!id) {
                id = "tmptid-" + _noid;
                _noid++;
                $the.prop("id", id);
            }
            //url 优先于 data 因为使用url的情况多
            if (url) {
                return _this.fac(id, url);
            }
            else {
                if (dataStr) {
                    if (/\(|\)|<|>|\./g.test(data) === false) {
                        var json = eval("(" + data + ")");
                        return _this.fac(id, json);
                    }
                    else {
                        return _this.fac(id, {
                        });
                    }
                }
                else if (data) {
                    data.tmptId = id;
                    return _this.fac(data);
                }
            }
        },
        //无内容异步加载模块，(无tmpt-m修饰，所以不影响全部渲染完成事件等，相对独立)初始没有还没有内容的模块，进行加载内容或延迟加载内容，内容加载后则形成正常模块并进行初始化
        initDelay: function () {
            var $async = $("[tmpt-async]");
            $async.each(function (i, v) {
                var $tas = $(this);
                $.ajax({
                    url: $tas.attr("tmpt-async"),
                    type: "get",
                    async: true,
                    dataType: "html",
                    success: function (html) {
                        $tas.html(html);
                        _baseFun.init($tas);
                        // $tas.show();
                    },
                    error: function (e) {
                        log("ajax-error:", e);
                    }
                });
            });
            //// 延迟加载模块；
            var $delay = $("[tmpt-delay]");
            $delay.each(function (i, v) {
                var $tas = $(this);
                var delaytime = $tas.attr("tmpt-delay-time");
                if (delaytime) {
                    setTimeout(function () {
                        $.ajax({
                            url: $tas.attr("tmpt-delay"),
                            type: "get",
                            async: true,
                            dataType: "html",
                            success: function (html) {
                                $tas.html(html);
                                _baseFun.init($tas);
                                //$tas.show();
                            },
                            error: function (e) {
                                log("ajax-error:", e);
                            }
                        });
                    }, delaytime);
                }
            });
        },
        //序列化转对象
        serializToObj: function (routeValue) {
            var obj = {
            };
            $.each(routeValue.split("&"), function (i, val) {
                var a = val.split("=");
                obj[a[0]] = a[1];
            });
            return obj;
        },
        /*
         * 获取$dom渲染的进度
         * @returns {double} 0~100
         */
        getRenderProcess: function () {
            //默认执行引擎就已经渲染50%；
            return 50 + 40 * _renderedNum / _num;
        },
        /*
         * 渲染出错的模块 
         */
        renderError: function (tmptid) {
            $m("#" + tmptid).find(".tmpt-load").css({
                "background": "url(" + _setting.loadErrorImage + ") 50% 50% no-repeat"
            });
        },
        /*
         * api数据状态 信息 安全验证预处理（处理数据状态判断，进行跳转、提示、是否渲染判断等处理）
         * @param {Object} data api数据
         * @returns {Bool} 验证结果
         */
        apiDataStatus: function (data) {
            if (data.Status == 200) return true;
            if (data.Status == 401) {
                document.location = _setting.loginUrl;
                return false;
            }
            if (data.Status == 404) {
                alertMs("没有找到！");
                return true;
            }
            if (data.Status == 500) {
                alertMs("服务器异常！");
                return true;
            }
            if (data.Status == 302) {
                alertMs("资源重定向！");
                return true;
            }
            return true;
        },
        /*
         * api数据预处理(于安全验证之后,进行格式转换等处理)
         * @param {Object} data api数据
         * @returns {Object} 处理后的数据
         */
        apiDataProcessing: function (data) {
            return data;
        }
    };
    //主题
    var _themes = {
        dialogDefault: '<div style="width:200px;height:100px;border:1px blue solid;"><div class="tmpt-dialog-content"></div><div class="tmpt-close">关闭</div></div>',
        /*jshint multistr: true */  //去除jshint识别字符串换行报错，以下同理
        dialogLoad: '<div class="object" id="object_one"></div>\
            <div class="object" id="object_two"></div>\
            <div class="object" id="object_three"></div>\
            <div class="object" id="object_four"></div>\
            <div class="object" id="object_five"></div>\
            <div class="object" id="object_six"></div>\
            <div class="object" id="object_seven"></div>\
            <div class="object" id="object_eight"></div>'
    };
    ////存放jquery延迟对象
    var _$jqxhr = {};

    //#region private data

    var _cache = {};
    var _$cache = {};
    var _Data = {};
    var _data = {};
    var _url = {};
    var _controller = {};
    var _action = {};
    var _routeValue = {};
    var _parameter = {};
    //tmpt数量
    var _num = $(".tmpt-m").length;
    //已渲染数量
    var _renderedNum = 0;
    //无Id Tmpt自动配置Id;
    var _noid = 0;
    //虚文档
    var _$document = $('<div id="documemt"></div>');
    //#endregion

    //#region private methord
    //记录错误
    var log = function (type, message) {
        console.log(type, message);
        try {
            $.ajax({
                type: "POST",
                async: true,
                url: _setting.apiUrl + _setting.errorUrl,
                data: { type: type, message: message },
                error: function () {
                    console.info("log error!");
                }
            });
        }
        catch (e) {
        }
    };
    /*
     * 放置模块
     */
    var putTmpt = function (tmptId, $tmpt) {
        if (!_$document.find("#" + tmptId).length)
            _$document.append($tmpt);
    };

    //--------------------------结构---------------------------------
    /// $index: tmpt-each内使用：当前对象在集合中序号;
    /// $last: tmpt-each内使用： 当前对象的外层对象（当前对象所属集合的对象）;
    /// TOP:最外层对象(json);
    /// $tmptid:当前模块id;
    /**
     * 渲染入口
     * @param {string} tmptid 模块id
     * @param {string or object } controller 
     * @param {type} action
     * @param {type} routevalue
     * @param {type} asyncflag
     * @returns {type} 
     */
    this.fac = function (tmptid, controller, action, routevalue, asyncflag) {
        if (typeof tmptid === "string" && typeof controller === "string" && typeof action === "string") {
            return moduleRender(tmptid, controller, action, routevalue, asyncflag);
        }
        //function
        else if (typeof tmptid === "function") {
            _event.ready.all.push(tmptid);
            return false;
        }
        //url
        else if (typeof tmptid === "string" && typeof controller === "string" && (typeof action === "undefined" || typeof action === "boolean")) {
            asyncflag = true;
            if (typeof action === "boolean") {
                asyncflag = action;
            }
            return moduleRender({ tmptId: tmptid, url: controller, asyncflag: asyncflag });
        }
        //object
        else if (typeof tmptid === "string" && (typeof controller === "object" || typeof controller === "undefined")) {
            //用来渲染 已经存在数据的模块； 可能需要对该数据进行缓存 或者缓存多个？
            if (typeof controller === "undefined") {
                controller = {};
            }
            return moduleRender({ tmptId: tmptid, data: controller });
        }
        //object
        else if (typeof tmptid === "object") {
            var tmptsetting = $.extend({}, {
                //调用Tmpt({})默认不触发ready事件；
                hasReady: false,
                onready: false,
                onerror_0: false
            }, tmptid);
            if (typeof tmptsetting.ready === "function") {
                _event.ready[tmptsetting.tmptid] = tmptsetting.onready;
            }
            if (typeof tmptsetting.error_0 === "function") {
                _event.error_0[tmptsetting.tmptid] = tmptsetting.onerror_0;
            }
            return moduleRender(tmptsetting);
        }
        else {
            return moduleRender(tmptid, controller, action, routevalue, asyncflag);
        }
    };

    //#endregion
    /*
     * 获取$tmpt(模块不一定从document文档中获取,因此对$()封装处理)
     * @param {String} tmptId 模块id
     * @returns {$} 模块jq对象
     */
    var $m = function (selector) {
        var $tmpt = $(selector);
        if ($tmpt.length) {
            //先从正常文档中获取
            return $tmpt;
        }
        else {
            //如果不存在再从虚文档中获取
            return _$document.find(selector);
        }
    };

    /*
     * 模块渲染主体
     * @param {String|Object|Function} tmptid
     * @param {String|Function} controller
     * @param {String} action
     * @param {String} routevalue
     * @param {Bool} asyncflag  
     */
    var moduleRender = function (tmptid, controller, action, routevalue, asyncflag) {
        // 是否触发完成事件(单tmpt ready与all ready )； 用于第一次加载需要完成事件（默认需要），再次加载可以决定是否需要(默认为不需要，可以使用.complete);
        var hasReady = true;
        var options = {};
        try {
            if (typeof tmptid === "object") {
                options = $.extend({}, {
                    tmptId: "",
                    controller: "",
                    action: "",
                    parameter: null,
                    asyncflag: true,
                    data: "",
                    url: "",
                    partialId: null,
                    hasReady: true
                }, tmptid);
                hasReady = options.hasReady;
                tmptid = options.tmptId;
                controller = options.controller;
                action = options.action;
                routevalue = options.parameter;
                asyncflag = options.asyncflag;
            }
            var source = "";                                 //模版html
            var $source = null;
            if (options.$tmpt) {
                putTmpt(tmptid, options.$tmpt);
            }
            var jtmpt;
            var $tmpt = $m("#" + tmptid);

            if (!options.partialId) {
                jtmpt = $tmpt[0];// document.getElementById(tmptid);
            }
            else {
                jtmpt = $tmpt.find("#" + options.partialId)[0]; // document.getElementById(tmptid);
            }

            if (!jtmpt) {
                throw ("未找到该模块！:" + tmptid);
            }
            var modulearr = [];

            if (_$cache[tmptid]) {
                //先从缓存中读取模版的html;
                if (!options.partialId) {
                    $source = _$cache[tmptid].clone();
                }
                else {
                    $source = _$cache[tmptid].clone().find("#" + options.partialId);
                }
            }
            else {
                modulearr = build($tmpt);
                $source = $tmpt.clone();
                _$cache[tmptid] = $source.clone();     //克隆该模版；
            }

            var renderdata = function (data) {
                if (data) {
                    //兼容旧的api状态处理
                    if (data.Type === 0) {
                        if (data.Message) {
                            alertMs(data.Message);
                        }
                        if (typeof _event.error_0[tmptid] === "function") {
                            $source.find(" .content, .tmpt-load").css({
                                "background": "url(" + _setting.loadErrorImage + ")"
                            });
                            _event.error_0[tmptid](data);
                        }
                    }
                    else if (data.Type == 401) {
                        document.location = _setting.loginUrl;
                    }
                    else {
                        _Data[tmptid] = data;
                        _data = data;                      //对数据进行缓存 20161013 需要进一步处理？？？
                        data.$id = tmptid; //"'" + tmptid + "'";  //TODO "'" + tmptid + "'"; 加单引？？？ 用于两个filter   去掉单引，用[]
                        var obj;
                        if (data.ListData && IsArray(data.ListData)) {
                            obj = data;
                        }
                        else if (data.ListData) {
                            obj = data.ListData;
                        }
                        else {
                            obj = data;
                        }
                        //if (tmptid === "班级详情") {
                        //    debugger
                        //}
                        // each块渲染
                        var $html = each4($source.clone(), obj, tmptid);

                        //each块外部渲染
                        jtmpt.outerHTML = render4($html, data, tmptid);

                        //渲染样式
                        _baseFun.styleRender(tmptid);
                        //渲染特性
                        _baseFun.attrRender(tmptid);

                        _baseFun.endLoad(tmptid);

                        //增加渲染完成后的回调函数
                        if (typeof _event.ready[tmptid] === "function" && hasReady) {
                            _event.ready[tmptid](tmptid, data);
                        }
                    }
                }
            };

            if (!!options.url) {
                var urlpa = options.url.split('?');
                routevalue = urlpa[1];
                var theurl = urlpa[0].split('/');
                controller = theurl[0];
                action = theurl[1];
            }

            //data 优先于 url
            if (!!options.data && typeof options.data === "object") {
                renderdata(options.data);
                $m("#" + tmptid).addClass("rendered");
                _baseFun.allready(hasReady, tmptid);
            }
            else {
                //参数存入缓存
                if (typeof routevalue === "string" && !!routevalue) {
                    //将routevalue中的函数体转化为正常格式
                    var regGolbal = /\{([^\}]*)\}/g;
                    var reg = /\{([^\}]*)\}/;
                    var matchArray = routevalue.match(regGolbal);
                    if (matchArray) {
                        for (var i = 0; i < matchArray.length; i++) {
                            evalResult = eval(matchArray[i].match(reg)[1]);
                            routevalue = routevalue.replace(matchArray[i], evalResult);
                        }
                    }
                    else {
                        //无函数体
                    }
                    //不是对像才进行存储
                    _routeValue[tmptid] = routevalue;
                }
                else {
                    // var key = options.partialId ? tmptid + "$" + options.partialId : tmptid;
                    _parameter[tmptid] = routevalue;//存储提交参数对象
                }
                action = action || _action[tmptid];
                controller = controller || _controller[tmptid];
                _action[tmptid] = action;
                _controller[tmptid] = controller;
                if (typeof routevalue === "string")
                    options.url = controller + "/" + action + "?" + routevalue;
                _url[tmptid] = options.url;

                if (controller != "Done") {
                    var jqxhr = $.tpajax({
                        url: _setting.apiUrl + "/" + controller + "/" + action,     //请求后台数据地址
                        data: routevalue,//submitdata,
                        async: asyncflag === false ? false : true,
                        type: "post",
                        // dataType: "json",                          接收需要的数据类型
                        //  contentType: "application/json",           发送的数据类型
                        success: function (data) {
                            if (_baseFun.apiDataStatus(data)) {
                                //渲染Data数据
                                renderdata(data.Data || data);
                            }
                            else {
                                //未通过验证处理
                            }
                        },
                        error: function (e) {
                            log("ajax-error-" + tmptid + "; url:" + controller + "/" + action, e);
                            jtmpt.outerHTML = render4($source, "", tmptid);
                            _baseFun.renderError(tmptid);
                        },
                        complete: function () {
                            $m("#" + tmptid).addClass("rendered");
                            _baseFun.allready(hasReady, tmptid);
                        }
                    });
                    _$jqxhr[tmptid] = jqxhr;
                    return jqxhr;
                }
                else {
                    ////无请求数据渲染
                    $m("#" + tmptid).addClass("rendered");
                    _baseFun.allready(hasReady, tmptid);
                }
            }
        }
        catch (ex) {
            ////渲染过程失败;
            $m("#" + tmptid).addClass("rendered");
            _baseFun.allready(hasReady, tmptid);

            log("moduleRender-error the tmptid is'" + tmptid + "'", ex);
        }
    };
    /*
     * 组装处理，对多配置的模块进行模版改造
     * @param {$} $module 模块对象(引用类型)
     */
    var build = function ($module) {           // routevalue ->'moduleid=干教资讯&page=1&rows=6&sort=Id&order=desc&ids=9&wordLimt=28,moduleid=最新资讯&page=1&rows=6&sort=Id&order=desc&ids=7&wordLimt=28'
        //如果该模版是容器模版
        if ($module.find(_setting.containerSelector).length > 0) {
            //如果该容器具备标题
            var $modules;
            if ($module.find(".module-title").length > 0) {
                $module.find(".module-title .title-add").eq(0).addClass("selected");
                $modules = $module.find(".module-content>.tmpt-m");
                if ($modules.length > 0) {
                    $modules.each(function (i, value) {
                        if (i > 0) {
                            $(this).addClass("tmpt-hide"); //tmpt-hide
                        }
                        var id = $(this).attr("id");
                        var controller = $(this).attr("controller");
                        var action = $(this).attr("action");
                        var routevalue = $(this).attr("routevalue");

                        //渲染内部模版
                        moduleRender(id, controller, action, routevalue);
                    });
                }
            }
            else {                       //无标题容器模块
                $modules = $module.find(".tmpt-m");
                if ($modules.length > 0) {
                    $modules.each(function () {
                        var id = $(this).attr("id");
                        var controller = $(this).attr("controller");
                        var action = $(this).attr("action");
                        var routevalue = $(this).attr("routevalue");
                        moduleRender(id, controller, action, routevalue);
                    });
                }
            }
        }
    };
    /*
     * 显示块处理
     * @param {$} $value
     * @param {Object} Obj
     * @param {String} id
     * @returns {Bool}
     */
    var renderBlock = function ($value, Obj, id) {
        //检验块的合理
        var $block = $value.parents("[tmpt-show]");
        if ($block.length > 0) {
            var showIf = $block.attr("tmpt-show")
                .replace(/{{/g, '')
                .replace(/}}/g, '');
            // showIf = render(showIf, Obj.$last, id);
            try {
                if (!logic(showIf, Obj, id)) {
                    $block.remove();
                    return false;
                }
                $block.removeAttr("tmpt-show");
                return true;
            } catch (e) {
                $block.remove();
                log("Tmpt-show and tmptid:" + id, e);
                return false;
            }
        }
        var thisShow = $value.attr("tmpt-show");
        if (thisShow) {
            try {
                thisShow = thisShow
                    .replace(/{{/g, '')
                    .replace(/}}/g, '');
                if (!logic(thisShow, Obj, id)) {
                    $value.remove();
                    return false;
                }
                $value.removeAttr("tmpt-show");
                return true;
            } catch (e) {
                $value.remove();
                log("Tmpt-show and tmptid:" + id, e);
                return false;
            }
        }

        //var $inShow = $value.find("[tmpt-show]");
        //if ($inShow.length > 0) {
        //    $inShow.each(function () {
        //        var $the = $(this);
        //        var showIf = $the.attr("tmpt-show")
        //       .replace(/{{/g, '')
        //       .replace(/}}/g, '');
        //        try {
        //            var re = logic(showIf, Obj, id);
        //            if (!re) {
        //                $the.remove();
        //            }
        //            //$the.removeAttr("tmpt-show");
        //        } catch (e) {
        //            $the.remove();
        //            log("Tmpt-show and tmptid:" + id, e);
        //        }
        //    });
        //}
        return true;
    };
    /**
     * 多each块循环处理
     * @param {$} $s
     * @param {Object} Obj
     * @param {String} id
     * @returns {$} 
     */
    var each4 = function ($s, Obj, id) {
        // if(id == "课程分类"){
        //     debugger;
        // }
        var $each = $s.find("[tmpt-each]").not($s.find("[tmpt-each] [tmpt-each]"));
        if ($each.length === 0) {
            $each = $s.find(".tmpt-each").not($s.find(".tmpt-each .tmpt-each")); //$s.find(".tmpt-each:not(.tmpt-each .tmpt-each)"); //获取source的each块，不包括嵌套的each
        }

        $each.each(function () {
            var $the = $(this);
            //  if (renderBlock($the, Obj, id)) {   //关闭块处理，默认有什么就渲染什么，不做判断处理
            //var list = TmptDB(Obj, id);    //客户端数据处理

            //model嵌套子model处理
            var modeldif = $the.attr("each-sonModel") || $the.attr("tmpt-each") || "ListData";
            // modeldif = Tmpt.render(modeldif, Obj, id);暂不实现tmpt-each可配置功能
            var str = "Obj." + modeldif;
            var sonModel = eval(str) || "";
            // var sonModel = Obj[modeldif]||"";
            if (sonModel !== "" && sonModel.length > 0) {
                $the.replaceWith(eachone4($the.clone(), sonModel, id, Obj));
            }
            else {
                //$the.html("");
                $the.remove();            //TODO 20161205 
            }
        });
        return $s;                                          //返回each被渲染的source；
    };

    /*
     * 单each块处理循环
     * @param {$} $value
     * @param {Arrage} ListData
     * @param {String} id
     * @param {Object} Obj
     * @returns {Html} 
     */
    var eachone4 = function ($value, ListData, id, Obj) {
        var $$each = $value.find("[tmpt-each]");
        if ($$each.length === 0) {
            $$each = $value.find(".tmpt-each");
        }
        var html = "";
        $.each(ListData, function (i, value) {
            var $clone = $value.clone();
            if (typeof value === "string") {                                     //支持字符串数组渲染
                html += render4($value, { $value: value, $index: i + 1 }, id);
            } else {                                             //支持对象数组渲染
                value.$index = i + 1;                         //“$index” 用来循环时，提供序号,在each内使用：{{$index}}
                value.$last = Obj;
                if ($$each.length > 0) {                      //可以补充个数据验证
                    if (value.Nodes && value.Nodes.length) {
                        $.each(value.Nodes, function (i, val) {
                            if (val.Nodes && val.Nodes.length) {     //val.Nodes && val.Nodes.length        //判断数据是否多层(至少三层的数据结构,模板只需两层,同时数据为Nodes才会进行递归)
                                $$each.append($$each.parent().clone());      //修改当前tmpt-each结构，递归出子tmpt-each的整个父级结构。
                                $clone = $value.clone();                     //当前结构发生改变，则进行覆盖处理；
                                return false;
                            }
                        });
                    }
                    each4($clone, value, id);
                    html += render4($clone, value, id);
                } else {
                    html += render4($clone, value, id);
                }
                //////
            }
        });
        return html;     //如果数组为空则返回"";
    };
    //------------------------------渲染---------------------------------
    /*
     * 渲染处理{{}}
     * @param {$} $code 
     * @param {Object} data 用来渲染的数据
     * @param {String} tmptid 
     * @returns {Html}
     */
    var render4 = function ($code, data, tmptid) {
        //if (!renderBlock($code, data, tmptid)) {
        //    return "";
        //}
        var code = $code[0].outerHTML;
        if (!code) {
            return "";
        }
        var mainCode = "";
        var each = "tmpt-each";

        //mainCode=code.replace(/{{.+}}/g, function (val) {
        //    return Tmpt.logic(val.slice(2,-2), data);
        //});

        // "abcd{{efgh}}ijkl{{mno}}pqr" ->"", "abcd", "efgh}}ijkl", "mno}}pqr"
        $.each(code.split(_setting.openTag), function (index, value) {
            value = value.split(_setting.clossTag);     // ""->"";  "abcd"->"abcd";   "efgh}}ijkl"->"efgh","ijkl"
            var $0 = value[0];
            var $1 = value[1];
            if (value.length === 1) {             //在{{前面的 原html语句
                mainCode += html(value);
            }
            else {
                mainCode += logic($0, data, tmptid);        //{{Name}} 需要替换的部分
                if ($1) {
                    mainCode += html($1);      //在}} 后面的 原html语句
                }
            }
        });
        mainCode = displayFilter(mainCode, data);
        //执行function功能
        mainCode = customFunction(mainCode, data);
        return mainCode;
    };
    /*
     * 直接输出html无渲染部分
     * @param {String} value
     * @returns {Html}
     */
    var html = function (value) {
        //  value = value.toString().replace("tmpt-each", "tmpt-doeach");   //对循环完成标记，可以考虑删掉
        return value;
    };
    /*
     * 渲染{{xxx}}
     * @param {String} value
     * @param {Object} data
     * @param {String} tmptid
     * @returns {Html|Text}
     */
    var logic = function (value, data, tmptid) {  //data是对象
        //  if (tmptid === "登录-短") debugger;
        var htmlencode = value.indexOf("#") === 0;
        if (htmlencode) {
            value = value.substring(1);
        };
        //var isJs = value.indexOf("js:") === 0;
        //if (isJs) {
        //    value = value.substring(3);
        //}
        ////这里可以考虑 将value 通过+-*/等运算符合拆开，使支持基本运算
        var inputv = value;
        try {
            var str = '';
            //处理函数逻辑,最多支持5个参数
            if (/[a-zA-Z]+\(/g.test(value) === true) {
                var fun = value.match(/([\w]+)\(/)[1];
                var pa = value.match(/[\w]+\(([^\)]+)\)/);
                var p1, p2, p3, p4, p5, p6;
                if (!!pa && pa.length > 1) {
                    var parms = pa[1].split(',');
                    $.each(parms, function (index, value) {
                        var val = "";
                        if (value == "$value") {            //{{fun($value,$value.data1,data2,'str')}}
                            val = data;
                        }
                        else if (/'[^']*'/.test(value)) {    //字符串
                            val = value.match(/'([^']*)'/)[1];
                        }
                        else if (/^\$value\.[\w\.]+/.test(value)) {
                            var d = value.match(/^\$value\.([\w\.]+)/)[1];
                            str = "data." + d;
                            val = eval(str);
                        }
                        else {
                            str = "data." + value;
                            val = eval(str);
                            // val = data[value] || "无数据";
                        }
                        switch (index) {
                            case 0: p1 = val; break;
                            case 1: p2 = val; break;
                            case 2: p3 = val; break;
                            case 3: p4 = val; break;
                            case 4: p5 = val; break;
                            case 5: p6 = val; break;
                        }
                    });
                }
                var result = false;
                if (typeof _renderFun[fun] === "function") {
                    result = htmlencode ? _baseFun.htmlEncode(_renderFun[fun](p1, p2, p3, p4, p5, p6)) : _renderFun[fun](p1, p2, p3, p4, p5, p6);
                    result = value.replace(/([\w]+)\([^\)]*\)/, result);
                }
                else if (typeof window[fun] === "function") {
                    result = htmlencode ? _baseFun.htmlEncode(window[fun](p1, p2, p3, p4, p5, p6)) : window[fun](p1, p2, p3, p4, p5, p6);
                    result = value.replace(/([\w]+)\([^\)]*\)/, result);
                }
                else {
                    log("logic error:tmptid is '" + tmptid + "' and error code is: " + inputv, "function:" + fun + " is undefined");
                }
                return result;
            }
            //处理运算逻辑
            else if (/\+|\-|\*|\/|<|>|==|!|\?/g.test(value)) {
                value = _baseFun.htmlDescode(value);
                value = value.replace(/[a-zA-Z\.\$']+/g, function (v) {
                    var val = "";
                    if (v == "$value") {
                        val = "data";
                    }
                    else if (/'[^']*'/.test(v)) {    //字符串
                        val = v;
                    }
                    else if (/^\$value\.[\w\.]+/.test(v)) {
                        var d = v.match(/^\$value\.([\w\.]+)/)[1];
                        val = "data." + d;
                    }
                    else {
                        val = "data." + v;
                    }
                    return val;
                });
                return eval(value);
            }
        }
        catch (e) {
            log("logic error:tmptid is '" + tmptid + "' and error code is: " + inputv, e);
        }
        var result = "";
        var point = value.match(/\./g);
        if (null !== point) {
            //存在“.”,组合为data.value1.value2.value3....的形式
            var pointIndex = value.lastIndexOf(".");
            var frontValue = value.substring(0, pointIndex);
            var lastValue = value.substring(pointIndex + 1);
            var dataExpression = "";
            var tmptDataExpression = "";

            //存在请求json顶层数据
            var frontArray = [];
            if (frontValue.match(/TOP/g)) {
                frontArray = frontValue.split(".");
                //去掉TOP，从Tmpt.data中读取数据
                if (frontArray.length > 1) {
                    for (var i = 1; i < frontArray.length; i++) {
                        tmptDataExpression += "_data\." + frontArray[i];
                    }
                }
                else {
                    tmptDataExpression += "_data";
                }
            }
            else {
                frontArray = frontValue.split(".");
                for (var y = 0; y < frontArray.length; y++) {
                    dataExpression += "data\." + frontArray[y];
                    tmptDataExpression += "_data\." + frontArray[y];
                }
            }

            dataExpression += "\." + lastValue;
            tmptDataExpression += "\." + lastValue;
            var evalDataResult;
            var evalTmptDataResult;
            try {
                evalDataResult = eval(dataExpression);
            }
            catch (e) {
                //alert("执行evalDataResult语句出错，错误信息为：" + e.message + ", value值为：" + value);
            }
            try {
                evalTmptDataResult = eval(tmptDataExpression);
            }
            catch (e) {
                //alert("执行evalTmptDataResult语句出错，错误信息为：" + e.message + ", value值为：" + value);
            }

            if (evalDataResult || evalDataResult === 0 || evalDataResult !== undefined) {
                result = evalDataResult;
            }
            else if (evalTmptDataResult || evalTmptDataResult === 0 || evalDataResult !== undefined) {
                result = evalTmptDataResult;
            }
            else {
                result = " 无数据   ";//
            }
        }
        else {
            //没有“.”
            if (!data) {
                result = " 无数据   ";//
            }
            else if (data[value] || data[value] === 0 || data[value] !== undefined) {
                result = data[value];
            }
            else if (_data[value] || _data[value] === 0 || _data[value] !== undefined) {
                result = _data[value];
            }
            else {
                result = " 无数据   ";//
            }
        }
        return htmlencode ? _baseFun.htmlEncode(result) : result;
    };
    //根据自定义属性tmpt-display的值判断是否显示
    var displayFilter = function (html, data) {
        var isDisplay;
        var $source = $($.parseHTML(html.replace(/\r\n/g, "")));
        var $display = $source.find("[tmpt-display]");
        if ($display.length > 0) {
            $display.each(function () {
                //初始化isDisplay，默认为不显示
                isDisplay = false;
                var judgeExpression = $(this).attr("tmpt-display");

                //全局匹配，多个[[***]]
                var globalReg = /\[\[[^\]]*\]\]/g;
                var matchResultArray = judgeExpression.match(globalReg);
                if (matchResultArray) {
                    for (var i = 0; i < matchResultArray.length; i++) {
                        //详细匹配，提出每一个[[***]]中的***并替换数据
                        var reg = /(\[\[)([^\]]*)(\]\])/;
                        var matchResult = matchResultArray[i].match(reg);
                        var needReplaceValue = matchResult[2];
                        var replacedResult = logic(needReplaceValue, data);

                        //将表达式中所有[[***]]替换成对应数据
                        if (replacedResult !== null && replacedResult !== "") {
                            //如果为数组类型，则数据替换为数组长度
                            if (IsArray(replacedResult)) {
                                judgeExpression = judgeExpression.replace(matchResultArray[i], replacedResult.length);
                            }
                            else {
                                judgeExpression = judgeExpression.replace(matchResultArray[i], replacedResult);
                            }
                        }
                        else {
                            judgeExpression = judgeExpression.replace(matchResultArray[i], "\'\'");
                        }
                    }
                }
                try {
                    //执行表达式，获取结果
                    isDisplay = eval(judgeExpression);
                }
                catch (e) {
                    //表达式错误，或有未取到的数据，处理为不显示
                    isDisplay = false;
                }

                //控制是否显示
                if (!isDisplay) {
                    //$(this).css("display", "none");
                    $(this).remove();
                }

                //移除属性，避免重复判断
                $(this).removeAttr("tmpt-display");
            });
            //返回过滤后的Html

            var outputHtml = "";
            for (var i = 0; i < $source.length; i++) {
                outputHtml += $source[i].outerHTML;
            }
            return outputHtml;
        }
        return html;
    };
    //函数功能，根据自定义属性tmpt-function的值执行对应函数
    var customFunction = function (html, data) {
        var $source = $($.parseHTML(html.replace(/\r\n/g, "")));
        var $fun = $source.find("[tmpt-function]");
        if ($fun.length > 0) {
            $fun.each(function () {
                var functionType = "default";
                //判断函数功能类型,默认为add
                $functionType = $(this).parent().find("[function-type]");
                if ($functionType.length > 0) {
                    if ($(this).attr("function-type") == "replace") {
                        functionType = "replace";
                    }
                    else {
                        //非替换，默认按添加处理
                    }
                }
                else {
                    //无类型参数，默认按添加处理
                }
                //全局匹配，多个[[***]]
                var globalReg = /\[\[[^\]]*\]\]/g;
                //详细匹配，提出[[***]]中的***并替换数据
                var reg = /(\[\[)([^\]]*)(\]\])/;
                var matchResultArray, matchResult, needReplaceValue, replacedResult;
                switch (functionType) {
                    case "replace": {
                        //移除属性，避免重复执行
                        $(this).removeAttr("function-type");
                        var functionName = $(this).attr("tmpt-function");
                        $(this).removeAttr("tmpt-function");
                        var tagHtml = $(this).prop("outerHTML");
                        //参数表达式，定义为{-***-},其中的数据仍用[[***]]表示
                        var paraReg = /{-[^-]*-}/g;
                        var matchParaArray = tagHtml.match(paraReg);
                        if (matchParaArray !== null) {
                            for (var i = 0; i < matchParaArray.length; i++) {
                                var paraDetailReg = /({-)([^-]*)(-})/;
                                var paraMatchResult = matchParaArray[i].match(paraDetailReg);
                                var para = paraMatchResult[2];
                                matchResultArray = para.match(globalReg);
                                if (matchResultArray !== null) {
                                    for (var j = 0; j < matchResultArray.length; j++) {
                                        matchResult = matchResultArray[j].match(reg);
                                        needReplaceValue = matchResult[2];
                                        replacedResult = logic(needReplaceValue, data);
                                        //将参数表达式中所有[[***]]替换成对应数据
                                        para = para.replace(matchResultArray[j], replacedResult);
                                    }
                                }
                                var functionExpression = functionName + "(" + para + ")";
                                var functionResult = '';
                                try {
                                    //执行函数
                                    functionResult = eval(functionExpression);
                                }
                                catch (e) {
                                    //表达式错误
                                    alert("tmpt-function(replace方法)错误： " + e.message + ", 执行语句为：" + functionExpression);
                                }
                                //将表达式中所有{-***-}替换成对应数据
                                tagHtml = tagHtml.replace(matchParaArray[i], functionResult);
                            }
                        }
                        $(this).prop("outerHTML", tagHtml);
                        break;
                    }
                    default: {
                        //初始化表达式，替换数据
                        var judgeExpression = $(this).attr("tmpt-function");
                        matchResultArray = judgeExpression.match(globalReg);
                        if (matchResultArray !== null) {
                            for (var g = 0; g < matchResultArray.length; g++) {
                                matchResult = matchResultArray[g].match(reg);
                                needReplaceValue = matchResult[2];
                                replacedResult = logic(needReplaceValue, data);
                                //将表达式中所有[[***]]替换成对应数据
                                judgeExpression = judgeExpression.replace(matchResultArray[g], replacedResult);
                            }
                        }
                        try {
                            //执行函数
                            var generateHtml = eval(judgeExpression);
                            $(this).append(generateHtml);
                        }
                        catch (e) {
                            //表达式错误
                            alert("tmpt-function错误： " + e.message + ", 执行语句为：" + judgeExpression);
                        }
                        //移除属性，避免重复执行
                        $(this).removeAttr("tmpt-function");
                        break;
                    }
                }
            });
            //返回过滤后的Html
            var outputHtml = "";
            for (var i = 0; i < $source.length; i++) {
                outputHtml += $source[i].outerHTML;
            }
            return outputHtml;
        }

        return html;
    };
    //-----------------------------------------------

    //兼容函数
    var compatible = function () {
        if (!Array.prototype.forEach) {
            Array.prototype.forEach = function (callback, thisArg) {
                var T, k;
                if (this === null) {
                    throw new TypeError(" this is null or not defined");
                }
                var O = Object(this);
                var len = O.length >>> 0; // Hack to convert O.length to a UInt32
                if ({
                }.toString.call(callback) != "[object Function]") {
                    throw new TypeError(callback + " is not a function");
                }
                if (thisArg) {
                    T = thisArg;
                }
                k = 0;
                while (k < len) {
                    var kValue;
                    if (k in O) {
                        kValue = O[k];
                        callback.call(T, kValue, k, O);
                    }
                    k++;
                }
            };
        }
        if (!Object.keys) {
            Object.keys = function (obj) {
                var arr = [];
                for (var i in obj) {
                    arr.push(i);
                }
                return arr;
            }
        };
        if (!Array.prototype.indexOf) {
            Array.prototype.indexOf = function (elt /*, from*/) {
                var len = this.length >>> 0;
                var from = Number(arguments[1]) || 0;
                from = (from < 0)
                    ? Math.ceil(from)
                    : Math.floor(from);
                if (from < 0)
                    from += len;
                for (; from < len; from++) {
                    if (from in this &&
                        this[from] === elt)
                        return from;
                }
                return -1;
            };
        };
    };
    /*
     * 自启动点
     */
    var init = function () {
        var tmpts = $(".tmpt-m[tmpt-url],.tmpt-m[tmpt-data]");
        if (tmpts.length > 0) {
            tmpts.each(function () {
                _baseFun.init($(this));
            });
        }
        _baseFun.initDelay();
        _event.renderProcess && _event.renderProcess(50, "$dom");
    };

    //#endregion

    //#region public methord
    //----------------------对外接口
    /*
     * 获取tmpt提交的数据;
     * @param {string} tmptId
     * @returns {Object}
     */
    this.getParameter = function (tmptId) {
        var param = _parameter[tmptId];
        if (param) {
            return param;
        }
        else {
            var route = _routeValue[tmptId];
            if (route) {
                return _baseFun.serializToObj(route);
            }
            else {
                return null;
            }
        }
    };

    /*
     * 获取tmpt请求的数据
     * @param {string} tmptId
     * @returns {Object}
     */
    this.getData = function (tmptId) {
        //if(xxxxxxxxx) 加密处理 密码验证 然后才能获取该数据。
        return _Data[tmptId] || null;
    };
    /*
    * 获取tmpt中的document(测试开放，正式取消该对外接口)
    * @returns {$}
    */
    this.getDoc = function () {
        return _$document;
    };
    this.getTmpt = function (tmptId, partialId) {
        if (partialId) {
            return _$cache[tmptId].find("#" + partialId);
        }
        return _$cache[tmptId];
    };
    /*
     * 
     */
    this.find = function (selector) {
        return $m(selector);
    };
    //----------------------事件
    //渲染完成事件注册；
    //$.Event("tmptReady");
    this.ready = function (tmptid, fun) {
        if (typeof tmptid === "string" && typeof fun === "function") {
            _event.ready[tmptid] = fun || false;
        }
        else if (typeof tmptid === "function") {
            _event.ready.all.push(tmptid || false);
        }
    };
    //无数据错误处理方法注册
    this.error_0 = function (tmptid, fun) {
        if (typeof tmptid === "string" && typeof fun === "function") {
            _event.error_0[tmptid] = fun || false;
        }
    };
    //进度变化事件；
    this.onProcessChange = function (fun) {
        _event.renderProcess = fun;
    }
    ////绑定事件
    this.on = function (tmptid, event, fun) {
        if (typeof tmptid === "string" && typeof event === "string" && typeof fun === "function") {
            _event[event][tmptid] = fun || false;
        }
        else if (typeof tmptid === "string" && typeof event === "function") {
            _event[tmptid].all.push(event || false);
        }
    };
    ////解除事件绑定
    this.off = function (tmptid, event) {
        if (typeof tmptid === "string" && typeof event === "string") {
            if (_event[event]) {
                _event[event][tmptid] = null;
            }
        }
        else if (typeof tmptid === "string") {
            if (_event[tmptid]) {
                _event[tmptid].all = null;
            }
        }
    };
    ////模块启动 tmpt-dalay-time 为undefined的延迟模块
    this.active = function (tmptid, time) {      //time 用来激活延迟时间
        if (typeof tmptid === "string") {
            //无具体延时id为tmptid的模块启动
            var $tas = $("#" + tmptid + "[tmpt-delay]");
            var delaytime = $tas.attr("tmpt-delay-time");
            if (!delaytime) {
                $.ajax({
                    url: $tas.attr("tmpt-delay"),
                    type: "get",
                    async: true,
                    dataType: "html",
                    success: function (html) {
                        $tas.html(html);
                        _baseFun.init($tas);
                        $tas.show();
                    },
                    error: function (e) {
                        log("ajax-error:", e);
                    }
                });
            }
        }
        else {
            //无具体延时的模块全启动
            var $delay = $("[tmpt-delay]:not([tmpt-delay-time])");
            $delay.each(function (i, v) {
                var $tas = $(this);
                $.ajax({
                    url: $tas.attr("tmpt-delay"),
                    type: "get",
                    async: true,
                    dataType: "html",
                    success: function (html) {
                        $tas.html(html);
                        _baseFun.init($tas);
                        $tas.show();
                    },
                    error: function (e) {
                        log("ajax-error:", e);
                    }
                });
            });
        }
    };


    ////延迟加载模块 同tmpt-delay 区别是一个通过标签 这个通过方法。如果是动态生成的tmpt-delay 可以结合active达到该效果
    //// 但该方法生成的 无法通过寻找延迟模块方式寻找，只能通过id识别
    this.delay = function (options) {
        options = $.extend({}, {
            outer: "",
            tmptId: "",
            tmptUrl: "",
            dataUrl: "",
            data: undefined
        }, options);
        var $outer = $(options.outer);
        var data;
        if (options.dataUrl) {
            data = options.dataUrl;
        }
        else if (options.data) {
            data = options.data;
        }
        if (options.tmptId) {
            $outer.attr("id", options.tmptId);
        }
        $.ajax({
            url: options.tmptUrl,
            type: "get",
            async: true,
            dataType: "html",
            success: function (html) {
                $outer.html(html);
                _baseFun.init($outer, { data: data });
            },
            error: function (e) {
                log("ajax-error:", e);
            }
        });
    };

    /*
     * 虚拟渲染
     * @param {object} options
     * @param {$} $outer 模块外架
     */
    this.virtual = function (options, back, $outer) {
        options = $.extend({
            tmptUrl: "",
            complete: ""
        }, options);
        $outer = $outer || $('<div></div>');
        if (options.tmptId) {
            $outer.attr("id", options.tmptId);
        }

        if (options.tmptUrl) {
            $.ajax({
                url: options.tmptUrl,
                type: "get",
                async: true,
                dataType: "html",
                success: function (html) {
                    $outer.html(html);
                    //将新模块加入_document对象中
                    options.$tmpt = $outer;
                    //开始渲染
                    var r = _baseFun.init($outer, options) || {};
                    r.complete && r.complete(function () {
                        options.complete && options.complete();
                    }) || options.complete();
                },
                error: function (e) {
                    log("ajax-error:", e);
                }
            });
        }
        else {
            alert("tmptUrl")
        }

    };
    //-----------------------注册
    //注册数据渲染处理方法
    this.renderFun = function (funname, fun) {
        if (typeof funname === "string" && typeof fun === "function") {
            _renderFun[funname] = fun || false;
        }
    };

    //注册主题
    this.themesFun = function (themename, content) {
        if (typeof themename === "string" && typeof content === "string") {
            _renderFun[themename] = content || "";
        }
    };

    //-----------------加载
    this.loadJs = function (arr) {
        if (typeof arr === "object") {
            if (arr.length) {
                $.each(arr, function (i, v) {
                    $.ajax({
                        url: v,
                        dataType: "script",
                        cache: true,
                        beforeSend: function (xhr) {
                            xhr.setRequestHeader("Cache-Control", "max-age=0");
                        }
                        //success: function (r) {console.log("xx",r) }
                    });

                    //var script = document.createElement('script');
                    //script.src = v;
                    //script.type = "text/javascript";
                    ////script["Cache-Control"] = 0;
                    //document.getElementsByTagName('body')[0].appendChild(script);
                });
            }
        }
        else if (typeof arr === "string") {
            $.each(arguments, function (i, v) {
                var script = document.createElement('script');
                script.src = v;
                document.getElementsByTagName('body')[0].appendChild(script);
            });
        }
    };
    this.loadCss = function (arr) {
        if (typeof arr === "object") {
            if (arr.length) {
                $.each(arr, function (i, v) {
                    var link = document.createElement('link');
                    link.href = v;
                    link.rel = "stylesheet";
                    document.getElementsByTagName('body')[0].appendChild(script);
                });
            }
        }
        else if (typeof arr === "string") {
            var link = document.createElement('link');
            link.href = arr;
            link.rel = "stylesheet";
            document.getElementsByTagName('body')[0].appendChild(script);
        }
    };

    //-----------------插件

    this.openWindow = function (options) {
        var _this = this;
        options = $.extend({
            htmlUrl: "",
            complete: false,
            title: ""
        }, options);

        //var tab = window.open(options.htmlUrl, "A");
        //var a = function () {
        //    if (tab.$ && tab.$(".tmpt-m:not(.rendered)").length === 0) {
        //        tab.document.title = options.title || "newPage";
        //        options.complete && options.complete(tab);
        //    }
        //    else {
        //        tab.setTimeout(a, 100);
        //    }
        //}
        //a();


        $.ajax({
            url: options.htmlUrl,
            type: "get",
            async: true,
            dataType: "html",
            success: function (html) {
                var tab = window.open("", "A");
                var doc = tab.document;
                doc.open();
                doc.write(html);
                tab.document.title = options.title || "newPage";
                doc.close();
                var a = function () {
                    if (tab.$ && tab.$(".tmpt-m:not(.rendered)").length === 0) {
                        options.complete && options.complete(tab);
                    }
                    else {
                        tab.setTimeout(a, 100);
                    }
                };
                a();
            },
            error: function (e) {
                alertMs("未找到");
                log("ajax-error:", e);
            }
        });
    };

    //加载效果
    this.showDialog = function (img, theme) {
        var $dialog = $('<div id="tmpt-dialog"></div>');
        if (img) {
            if (theme) {
                //对话框运行主题切换
                $dialog.html(_themes[theme]);
                $dialog.find(".tmpt-dialog-content").text(img);
            }
            else {
                $dialog.html(_themes.dialogDefault);
                $dialog.find(".tmpt-dialog-content").text(img);
                $dialog.find(".tmpt-close").click(function () {
                    this.closeDialog();
                });
            }
        }
        else {
            //加载效果暂不支持主题切换;
            $dialog.html(_themes.dialogLoad);
        }
        $("body").append($dialog);
    };
    //结束加载
    this.closeDialog = function () {
        $("body #tmpt-dialog").remove();
    };
    var _validate = {
        defaultMessage: {
            "max": "字数不能超过{0}字",
            "min": "字数不能少于{0}字"
        },
        rules: {
            "__ruleName": {
                "__key": {
                    rule: {
                        "max": 5,
                        "min": 1
                    },
                    message: {
                        "max": "sssss"
                    }
                }
            }
        }
    };

    this.addRule = function (wrapper, rule) {
        _validate.rules[wrapper] = rule;
    };

    this.validate = function (selector, validate) {
        if (typeof validate == "string") {
            validate = _validate.rules[validate];
        };
        var formdata = [];
        if (typeof selector == "string") {
            formdata = $(selector).find("textarea, input, select").not(".novalidate").serializeArray();
        }
        else {
            formdata = selector;
        }
        for (var n = 0; n < formdata.length; n++) {
            var v = formdata[n];
            var value = v.value;
            if (validate[v.name]) {
                for (var j in validate[v.name].rule) {
                    var rulev = validate[v.name].rule[j];
                    if (rulev) {
                        var message = validate[v.name].message && validate[v.name].message[j] || null;
                        switch (j) {
                            case "max":
                                if (value.length > rulev) {
                                    alertMs(message || _validate.defaultMessage[j].format(rulev));
                                    return false;
                                }
                                break;
                            case "min":
                                if (value.length < rulev) {
                                    alertMs(message || _validate.defaultMessage[j].format(rulev));
                                    return false;
                                }
                                break;
                            default:
                        }
                    }
                }
            }
        }
        return true;
    }

    //#endregion
    compatible();
    $(function () {
        //加载完成再初始化，为了添加独立事件等
        init();
    });
}
//生成页面引擎对象
var $dom = new TmptJs({
    // apiUrl: API_URL,
    noImage: "/Content/V3/images/notFound.jpeg"
});
//简化调用方法；
var $R = $dom.fac;
//兼容Tmpt方式；
//var Tmpt = $.extend($R, $dom);

$(function () {
    $("body").on("click", ".tmpt-onsearch", function () {

    });
});

//搜索 - start
function tmptSearch(tmptid, partialId) {
    var param = $dom.getParameter(tmptid);
    $("[tmpt-search],[jy-search]").find("input,select").each(function (i, val) {
        if (val.value.indexOf("请输入") === 0) {
            val.value = "";
        }
        param[val.name] = val.value;
    });
    param.page = 1;
    switch (partialId) {
        case "courseType":
            partialId = param["courseType"];
            break;
        default:
    }
    $R({
        tmptId: tmptid,
        partialId: partialId || null,
        parameter: param,
        errorUrl: "/common/AddFrontError",
        loginUrl: "/Home/Login.html"
    });
}
//end - 搜索

/////////////////////////////////

//分页功能 - start
function PagingController(id, page, rows, count, categoryId) {
    var outputHtml = "";
    var step = 4;
    if (id == "无数据" && page == "无数据" && rows == "无数据" && count == "无数据") {
        //未取到数据，返回空
        return outputHtml;
    }
    else {
    }

    //初始化数据
    var pageNum = Math.ceil(count / rows);
    var leftNum = 0;
    var rightNum = 0;
    var clickFunction = "PagingJump";

    //当前页
    if ((page - step) < 1) {
        leftNum = 1;
    }
    else {
        leftNum = page - step;
    }
    if ((page + step) > pageNum) {
        rightNum = pageNum;
    }
    else {
        rightNum = page + step;
    }

    //控制页
    if (page > 1) {
        outputHtml += "<span><a href=\"javascript:void(0);\" onclick=\"" + clickFunction + "('" + id + "'," + (1) + "," + rows + "," + categoryId + ")\">首页</a></span>";
        outputHtml += "<span><a href=\"javascript:void(0);\" onclick=\"" + clickFunction + "('" + id + "'," + (page - 1) + "," + rows + "," + categoryId + ")\">上一页</a></span>";
    }
    //else {
    // outputHtml += "<span onclick=\"" + clickFunction + "('" + id + "'," + (1) + "," + rows + "," + categoryId + ")\">首页</span>";
    //  }
    for (var i = leftNum; i <= rightNum; i++) {
        if (page == i) {
            outputHtml += "<span class=\"p_num current\">" + i + "</span>";
        }
        else {
            outputHtml += "<span class=\"p_num2\"><a href=\"javascript:void(0);\" onclick=\"" + clickFunction + "('" + id + "'," + i + "," + rows + "," + categoryId + ")\">" + i + "</a></span>";
        }
    }
    if (page < pageNum) {
        outputHtml += "<span><a href=\"javascript:void(0);\" onclick=\"" + clickFunction + "('" + id + "'," + (page + 1) + "," + rows + "," + categoryId + ")\">下一页</a></span>";
        outputHtml += "<span><a href=\"javascript:void(0);\" onclick=\"" + clickFunction + "('" + id + "'," + (pageNum) + "," + rows + "," + categoryId + ")\">尾页</a></span>";
    }
    //else {
    //    outputHtml += "<span onclick=\"" + clickFunction + "('" + id + "'," + (pageNum) + "," + rows + "," + categoryId + ")\">尾页</span>";
    //}
    //统计页
    outputHtml += "<span>共 " + pageNum + " 页,总记录 " + count + " 条</span>";

    return outputHtml;
}
//end - 分页功能

//分页功能 - start
function PagingPart(id, partialId, page, rows, count, categoryId) {
    var outputHtml = "";
    var step = 4;
    if (id == "无数据" && page == "无数据" && rows == "无数据" && count == "无数据") {
        //未取到数据，返回空
        return outputHtml;
    }
    else {
    }

    //初始化数据
    var pageNum = Math.ceil(count / rows);
    var leftNum = 0;
    var rightNum = 0;
    var clickFunction = "PagingPartJump";

    //当前页
    if ((page - step) < 1) {
        leftNum = 1;
    }
    else {
        leftNum = page - step;
    }
    if ((page + step) > pageNum) {
        rightNum = pageNum;
    }
    else {
        rightNum = page + step;
    }

    //控制页
    if (page > 1) {
        outputHtml += "<span><a href=\"javascript:void(0);\" onclick=\"" + clickFunction + "('" + id + "'," + (1) + "," + rows + ",'" + partialId + "')\">首页</a></span>";
        outputHtml += "<span><a href=\"javascript:void(0);\" onclick=\"" + clickFunction + "('" + id + "'," + (page - 1) + "," + rows + ",'" + partialId + "')\">上一页</a></span>";
    }
    //else {
    //    outputHtml += "<span onclick=\"" + clickFunction + "('" + id + "'," + (1) + "," + rows + ",'" + partialId + "')\">首页</span>";
    //}
    for (var i = leftNum; i <= rightNum; i++) {
        if (page == i) {
            outputHtml += "<span class=\"p_num current\">" + i + "</span>";
        }
        else {
            outputHtml += "<span class=\"p_num2\"><a href=\"javascript:void(0);\" onclick=\"" + clickFunction + "('" + id + "'," + i + "," + rows + ",'" + partialId + "')\">" + i + "</a></span>";
        }
    }
    if (page < pageNum) {
        outputHtml += "<span><a href=\"javascript:void(0);\" onclick=\"" + clickFunction + "('" + id + "'," + (page + 1) + "," + rows + ",'" + partialId + "')\">下一页</a></span>";
        outputHtml += "<span><a href=\"javascript:void(0);\" onclick=\"" + clickFunction + "('" + id + "'," + (pageNum) + "," + rows + ",'" + partialId + "')\">尾页</a></span>";
    }
    //else {
    //    outputHtml += "<span onclick=\"" + clickFunction + "('" + id + "'," + (pageNum) + "," + rows + ",'" + partialId + "')\">尾页</span>";
    //}
    //统计页
    outputHtml += "<span>共 " + pageNum + " 页,总记录 " + count + " 条</span>";

    return outputHtml;
}
//end - 分页功能
function PagingPartJump(id, page, rows, partialId) {
    var param = $dom.getParameter(id);
    param.page = page;
    param.rows = rows || param.rows;
    var typeName = $("#" + id + " #" + partialId).parents(".fun-group").attr("fun-group-name");
    if (typeName) {
        param[typeName] = partialId;
    }
    $R({
        tmptId: id,
        partialId: partialId,
        parameter: param
    }).complete(function () {
        $("#" + id + " #" + partialId).addClass("show");
    });
}

//分页跳转实现 
function PagingJump(moduleId, page, rows, categoryId, foo) {
    var index = "";
    if (typeof (moduleId) == "string") {
        index = moduleId;
    }
    else {
        index = moduleId.id;
    }
    var parameter = $dom.getParameter(index);
    if (parameter) {
        //$("div#" + moduleId.id).children().remove();
        parameter.page = page;
        parameter.rows = rows || parameter.rows;
        parameter.search && (parameter.search = "");
        if (moduleId == "课程列表") {
            parameter.teacher = "";
            parameter.title = "";
            parameter.courseType = "";
        }

        if (categoryId !== undefined && typeof (categoryId) == "number") {
            if (parameter.categoryId !== undefined) {
                parameter.categoryId = categoryId;
            }
            if (parameter.channelId !== undefined) {
                parameter.channelId = categoryId;
            }
        }
        $R({
            tmptId: index,
            parameter: parameter
        }).complete(function () {
            if (typeof foo == "function") {
                foo();
            }
        });
    }
    else {
        alert("无请求参数，请检查参数缓存： $dom.routeValue");
    }
}
//end - 分页跳转实现

String.format = function (str) {
    var param = arguments;
    return str.replace(/\{\d+\}/ig, function (val) {
        var i = parseInt(val.match(/{(\d+)}/)[1]);
        return param[i + 1];
    });
}

String.prototype.format = function () {
    var param = arguments;
    return this.replace(/\{\d+\}/ig, function (val) {
        var i = parseInt(val.match(/{(\d+)}/)[1]);
        return param[i];
    });
}

//时间格式转换 - start
function ParseTime(dateSource, form) {
    var outputHtml = "";
    var date;
    if (dateSource !== null && dateSource != '无数据') {
        if (dateSource == "now") {
            date = new Date();
            date.setTime(Date.now());
            if (form) {
                outputHtml += date.format(form);
            }
            else {
                outputHtml += date.toLocaleString();
            }
        }
        else {
            var reg = /Date\(([^\)]*)\)/;
            if (dateSource.toString().match(reg)) {
                date = new Date();
                date.setTime(parseInt(dateSource.toString().match(reg)[1]));
                if (form) {
                    outputHtml += date.format(form);
                }
                else {
                    outputHtml += date.toLocaleString();
                }
            }
            else {
                //无匹配，非Date（）格式
            }
        }
    }
    else {
        //数据为空
    }
    return outputHtml;
}
Date.prototype.format = function (format) {
    var date = {
        "M+": this.getMonth() + 1,
        "d+": this.getDate(),
        "h+": this.getHours(),
        "m+": this.getMinutes(),
        "s+": this.getSeconds(),
        "q+": Math.floor((this.getMonth() + 3) / 3),
        "S+": this.getMilliseconds()
    };
    if (/(y+)/i.test(format)) {
        format = format.replace(RegExp.$1, (this.getFullYear() + '').substr(4 - RegExp.$1.length));
    }
    for (var k in date) {
        if (new RegExp("(" + k + ")").test(format)) {
            format = format.replace(RegExp.$1, RegExp.$1.length == 1 ? date[k] : ("00" + date[k]).substr(("" + date[k]).length));
        }
    }
    return format;
};

//end - 时间格式转换
//警告功能 - start
/**
 * this is a method replacing the alert and confirm
 * @param  {object or string} options       the content of alert things
 * @param  {number} opt_warntype  chooce alert type or confirm type or original
 * @param  {function} opt_callback1 return function of confirm
 * @param  {function} opt_callback2 return function of cancle
 * @return {html}               change the alert style
 */
function alertMs(options, opt_warntype, opt_callback1, opt_callback2) {
    var option = {
        warnType: 1, //1 为alert型; 2 为confirm型; 3 为系统alert型
        Title: "消息",
        Message: "错误",
        theme: "red" //"red","blue","green","yellow"可以在generateCSS的themes添加对象
    };
    var generate = {
        HTML: function (option) {
            var $html = "" +
                "<div id=\"msOut\">" +
                "    <div id=\"msBox\">" +
                "        <div class=\"msTitle\">" + option.Title + "</div>" +
                "        <div class=\"msMessage\">" + option.Message + "</div>" +
                "        <div class=\"msBtn\">" +
                "            <span class=\"msConfirm\">确定</span>" +
                (option.warnType == 2 ? "<span class=\"msReject\">取消</span>" : "") +
                "        </div>" +
                "    </div>" +
                "    <div class=\"msLayer\"></div>" +
                "</div>";
            $('body').append($html);
            this.CSS(option);
        },
        CSS: function (option) {
            var themes = { "red": "#CC3300", "blue": "#99CCFF", "green": "#00FF99", "yellow": "#FFFF66" };
            var themeColor = themes[option.theme];
            for (var color in themes) {
                if (color == option.theme) {
                    themeColor = themes[color];
                    break;
                }
            }
            $("#msOut").css({ "width": '100%', "height": '100%', "zIndex": '99999', "position": 'fixed', "top": '0', "left": '0' });
            $(".msLayer").css({ "width": '100%', "height": '100%', "filter": 'Alpha(opacity=40)', "backgroundColor": '#000', "opacity": '0.4' });
            $("#msBox").css({ "width": '500px', "height": '300px', "zIndex": '99999', "position": 'absolute', "opacity": "0" });
            $(".msTitle").css({ "display": 'block', "fontSize": '14px', "color": '#444', "padding": '10px 15px', "backgroundColor": '#f0f4f7', "borderRadius": '15px 15px 0 0', "borderBottom": '3px solid ' + themeColor, "fontWeight": 'bold' });
            $(".msMessage").css({ "padding": " 50px", "line-height": " 22px", "background-color": "#393D49", "color": "#fff", "font-weight": "300", "overflow": "hidden", "text-overflow": "ellipsis" });
            $(".msBtn").css({ "padding": '15px 0 10px 0', "borderRadius": '0 0 15px 15px', "textAlign": 'center', "background-color": "#f0f4f7" });
            $(".msConfirm").css({ "display": "inline-block", "height": "28px", "line-height": "28px", "margin": "0 6px", "padding": "0 15px", "border": "1px solid" + themeColor, "background-color": themeColor, "color": " #fff", "border-radius": "2px", "font-weight": "400", "cursor": "pointer", "text-decoration": "none" });
            $(".msReject").css({ "display": "inline-block", "height": "28px", "line-height": "28px", "margin": "0 6px", "padding": "0 15px", "border": "1px solid #dedede", "background-color": "#f1f1f1", "color": "#333", "border-radius": "2px", "font-weight": "400", "cursor": "pointer", "text-decoration": "none" });
            this.Event(opt_callback1, opt_callback2);
        },
        Event: function (opt_callback1, opt_callback2) {
            var $width = document.documentElement.clientWidth;  //屏幕宽
            var $height = document.documentElement.clientHeight; //屏幕高
            var boxWidth = $("#msBox").width();
            var boxHeight = $("#msBox").height();
            $("#msBox").css({ "left": ($width - boxWidth) / 2 + "px" });
            $("#msBox").stop().animate({ "top": ($height - boxHeight) / 2 + "px", "left": ($width - boxWidth) / 2 + "px", "opacity": "1" }, 300);
            $(".msConfirm").click(function () {
                $("#msBox").stop().animate({ "top": "0", "opacity": "0.2" }, 300, function () { $("#msOut").remove(); });
                if (typeof opt_callback1 === "function") {
                    opt_callback1();
                    $('.msOut').remove()
                }
            });
            $(".msReject").click(function () {
                $("#msBox").stop().animate({ "top": "0", "opacity": "0.2" }, 300, function () { $("#msOut").remove(); });
                if (typeof opt_callback2 === "function") {
                    opt_callback2();
                    $('.msOut').remove()
                }
            });
        }
    }
    if (typeof options === "string") {
        option.Message = options;
        if (typeof opt_warntype === "number") {
            if (opt_warntype != 3) {
                option = $.extend(option, { warnType: opt_warntype });
                generate.HTML(option);
            } else {
                alert(option.Message);
            }
        } else if (typeof opt_warntype === "function") {
            opt_callback1 = opt_warntype;
            generate.HTML(option);
        } else {
            generate.HTML(option);
        }
    } else if (typeof options === "object") {
        option = $.extend(option, options);
        if (typeof opt_warntype === "number") {
            if (opt_warntype != 3) {
                option = $.extend(option, { warnType: opt_warntype });
                generate.HTML(option);
            } else {
                alert(option.Message);
            }
        } else if (typeof opt_warntype === "function") {
            option = $.extend(option, options);
            opt_callback1 = opt_warntype;
            generate.HTML(option);
        } else {
            generate.HTML(option);
        }
    }

};
//end - 警告功能


//jquery 数组（伪数组）类型判断 - start
var IsArray = function (value) {
    return value &&
        typeof value === 'object' &&
        typeof value.length === 'number' &&
        typeof value.splice === 'function' &&
        !(value.propertyIsEnumerable('length'));
};

function JudgeType(value) {
    var outputHtml = "";

    if (value == "ThreeScreenCourse") {
        outputHtml = "三分屏";
    }
    else if (value == "AnimationCourse") {
        outputHtml = "动画";
    }
    else if (value == "SingleCourse") {
        outputHtml = "单视频";
    }

    return outputHtml;
}

function JudgeStatus(status) {
    var outputHtml = "";
    if (status != "null") {
        switch (status) {
            case "Normal":
                outputHtml += "已报名";
                break;
            case "UnAudit":
                outputHtml += "等待审核";
                break;
            case "UnApprove":
                outputHtml += "审核未通过";
                break;
        }
    }
    else {
        //status == null
    }
    return outputHtml;
}
//end - jquery 数组（伪数组）类型判断
String.prototype.toCharCode = function (arg) {
    var value = "";
    arg = arg || ' ';
    for (var i = 0; i < this.length; i++) {
        value += this.charCodeAt(i) + arg
    }
    return value;
};

String.prototype.toCharString = function (arg) {
    var value = "";
    arg = arg || ' ';
    var arr = this.split(arg);
    for (var i = 0; i < arr.length; i++) {
        value += String.fromCharCode(arr[i]);
    }
    return value;
};


//------------------------------otherPage custome
$dom.renderFun("examIndex", function (data, type) {
    var index = ["一", "二", "三", "四", "五", "六", "七", "八", "九", "十"];
    var i = 0;
    i = (data.Type0Questions || []).length > 0
        ? type === "Type0Questions"
            ? i : (++i,
                (data.Type1Questions || []).length > 0
                    ? type === "Type1Questions"
                        ? i : (++i,
                            (data.Type2Questions || []).length > 0
                                ? type === "Type2Questions"
                                    ? i : (++i,
                                        (data.Type3Questions || []).length > 0
                                            ? type === "Type3Questions"
                                                ? i : i
                                            : ++i)
                                //Type2Questions 不存在
                                : ((data.Type3Questions || []).length > 0
                                    ? type === "Type3Questions"
                                        ? i : i
                                    : ++i))
                    //Type1Questions 不存在
                    : ((data.Type2Questions || []).length > 0
                        ? type === "Type2Questions"
                            ? i : (++i,
                                (data.Type3Questions || []).length > 0
                                    ? type === "Type3Questions"
                                        ? i : i
                                    : ++i)
                        : ++i))
        //Type0Questions 不存在
        : ((data.Type1Questions || []).length > 0
            ? type === "Type1Questions"
                ? i : (++i,
                    (data.Type2Questions || []).length > 0
                        ? type === "Type2Questions"
                            ? i : (++i,
                                (data.Type3Questions || []).length > 0
                                    ? type === "Type3Questions"
                                        ? i : i
                                    : ++i)
                        : ++i)
            : ++i);
    return index[i];
});


