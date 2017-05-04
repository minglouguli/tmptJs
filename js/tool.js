;
function tablePaging(id, page, rows, count, categoryId) {
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
    var clickFunction = "tablePagingPartJump";

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
        outputHtml += "<span class=\"p_num2\" onclick=\"" + clickFunction + "('" + id + "'," + (1) + "," + rows + " )\">首页</span>";
        outputHtml += "<span class=\"p_num2\" onclick=\"" + clickFunction + "('" + id + "'," + (page - 1) + "," + rows + ")\">上一页</span>";
    }
    //else {
    //    outputHtml += "<span onclick=\"" + clickFunction + "('" + id + "'," + (1) + "," + rows + ",'" + partialId + "')\">首页</span>";
    //}
    for (var i = leftNum; i <= rightNum; i++) {
        if (page == i) {
            outputHtml += "<span class=\"p_num current\">" + i + "</span>";
        }
        else {
            outputHtml += "<span class=\"p_num2\" onclick=\"" + clickFunction + "('" + id + "'," + i + "," + rows + ")\">" + i + "</span>";
        }
    }
    if (page < pageNum) {
        outputHtml += "<span class=\"p_num2\" onclick=\"" + clickFunction + "('" + id + "'," + (page + 1) + "," + rows + ")\">下一页</span>";
        outputHtml += "<span class=\"p_num2\" onclick=\"" + clickFunction + "('" + id + "'," + (pageNum) + "," + rows + ")\">尾页</span>";
    }
    //else {
    //    outputHtml += "<span onclick=\"" + clickFunction + "('" + id + "'," + (pageNum) + "," + rows + ",'" + partialId + "')\">尾页</span>";
    //}
    //统计页
    outputHtml += "<span>共 " + pageNum + " 页,总记录 " + count + " 条</span>";

    return outputHtml;
}
//end - 分页功能
function tablePagingPartJump(id, page, rows) {
    var param = $dom.getParameter(id) || {};
    param.page = page;
    param.rows = rows || param.rows;

    $R({
        tmptId: id,
        data: {
            HeadList: headList,
            DataList: getDate(page, rows),
            Page: page,
            Rows: rows,
            Count: 3146
        }
    }).complete(function () {
        var $c = $("[t-checked]").each(function (i, v) {
            var $v = $(v);
            if ($v.attr("t-checked") == "true") {
                v.checked = true;
                $v.change();
            }
        });
    });
}

var dropTreeCheck = function (exoptions) {
    var options = $.extend({}, {
        $outer: {},
        options: {
            operateCode: ""
        },
        context: {
            Code: "",
            Name: "",
            EditType: "",
            DataValue: "",
            WidthClass: "col-md-3"
        },
        data: {},
        exdata: {}
    }, exoptions);
    controls = "<div class='" + options.context.WidthClass + " minheight' id='" + options.context.Code + "' data-container='" + options.context.Code + "'>" +
        "<div class='form-group fix-btn-group-block'>" +
        "<label class='control-label'>" + options.context.Name + "</label>" +
        "<div class='dropdown dropdown-creat'>" +
        "<input type='text' class='btn btn-default btn-block dropdown-toggle form-filter parentText ' name='" + options.context.Name + "' readonly/>" +
        "<div class='dropdown-menu'>" +
        "<div class='showParents'>" +
        "<div class='row'>" +
        "<div class='col-md-7 col-md-offset-1'>" +
        "<input type='input' class='form-control' id='input-search-" + options.context.Code + "' placeholder='搜索'></div>" +
        "<div class='btn-group col-md-4'>" +
        "<button class='btn btn-success' id='btn-search-" + options.context.Code + "' type='button'>搜索</button><button class='btn btn-default' id='btn-clear-search-" + options.context.Code + "' type='button'>清除</button>" +
        "</div>" +
        "</div>" +
        "<div class='tree-creat' ></div>" +
        "</div>" +
        "</div>" +
        "</div>" +
        "</div>" +
        "</div>" +
        "</div>";
    $(".form-body", options.$outer).append(controls);
    $.jyajax({
        url: options.options.domainurl + options.context.DataValue,
        async: true,
        type: 'POST',
        dataType: 'json',
        success: function (data) {
            //数据绑定

            var $val = [];
            var $href = [];
            thismodal.dropobj[options.context.Code] = $('.tree-creat', wrapper.find("#" + options.context.Code)).treeview({
                data: data,
                levels: 1,
                color: "#2489C5",
                showBorder: false,
                showCheckbox: true,
                highlightSelected: false,
                onNodeChecked: function (event, data1) {
                    $('#checkable-output').prepend('<p>' + data1.text + ' was checked</p>');
                    $val.push(data1.text);
                    $href.push(data1.href);
                    $('.parentText', wrapper.find("#" + options.context.Code)).val($val);
                    thismodal.submitdata[options.context.Code] = $href;
                },
                onNodeUnchecked: function (event, data) {
                    $('#checkable-output').prepend('<p>' + data.text + ' was unchecked</p>');
                    $href.splice($href.indexOf(data.href), 1);
                    $val.splice($val.indexOf(data.text), 1);
                    $('.parentText', wrapper.find("#" + options.context.Code)).val($val);
                    thismodal.submitdata[options.context.Code] = $href;
                },
            });

            $('#btn-search-' + options.context.Code).on('click', function (e) {
                var pattern = $('#input-search-' + options.context.Code, wrapper).val();

                var results = thismodal.dropobj[options.context.Code].treeview(
                    'search',
                    [
                        pattern + "",
                        null,
                        {
                            ignoreCase: true,     // case insensitive
                            exactMatch: false,    // like or equals
                            revealResults: true,  // reveal matching nodes
                        }
                    ]
                );
            });
            $('#btn-clear-search-' + options.context.Code).on('click', function (e) {
                thismodal.dropobj[options.context.Code].treeview('clearSearch');
                $('#input-search-' + options.context.Code, wrapper).val('');
            });
            //edit数据写入
            if ((options.operateCode == "edit" || options.operateCode == "details") && choosedata[options.context.Code] !== undefined) {
                var nodeId = choosedata[options.context.Code];
                if (nodeId !== undefined && nodeId !== null) {
                    for (var i = 0; !($('.tree-creat', wrapper.find("#" + options.context.Code)).treeview('getNode', i).href === undefined); i++) {
                        var no = $('.tree-creat', wrapper.find("#" + options.context.Code)).treeview('getNode', i);
                        for (var u = 0; u < nodeId.length; u++) {
                            if (no.href == nodeId[u]) {
                                var noe = $('.tree-creat', wrapper.find("#" + options.context.Code)).treeview('checkNode', i);
                            }
                        }
                        // nodeId.forEach(function (value) {
                        //     if (no.href == value) {
                        //         var noe = $('.tree-creat', wrapper.find("#" + options.context.Code)).treeview('checkNode', i);
                        //     }
                        // });
                    }
                }
            }

            //打开或关闭下拉框
            if (options.context.DisabledFlag) {
                wrapper.find("#" + options.context.Code + " .parentText").attr("disabled", "disabled");
                // options.$outer.find("#" + options.context.Code).selectpicker('refresh');
            }
            $(".parentText", wrapper.find("#" + options.context.Code)).click(function () {
                $(".dropdown-creat", wrapper.find("#" + options.context.Code)).toggleClass('open');
            });
            wrapper.find("#" + options.context.Code).find('.dropdown-menu').click(function (e) {
                e.stopPropagation();
            });
        }
    });
}