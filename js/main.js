;
var postData = {};
var rowData = {};
postData.ListData = [];

//--------init

$dom.set({
    apiUrl: "/api"
});
$dom.renderFun("getIndex", function (i, p, r) {
    return i + (p - 1) * r;
});
$dom.renderFun("ceil", function (a, b) {
    return Math.ceil(a / b);
});
$dom.renderFun("getCheck", function (i, p, r) {
    var key = i + (p - 1) * r;
    if (rowData[key]) {
        return true;
    }
    else {
        return false;
    }
});


//---------------------------------------------------------------

$R("menu",
    {
        Name: ["菜单一", "菜单二", "菜单三", "菜单四"]
    });

$R("DataTables_Table_1_wrapper", {
    HeadList: headList,
    DataList: getDate(1, 10),
    Page: 1,
    Rows: 10,
    Count: 3146
}).complete(function (data) {

});

//$R("platformId", "platform/platformcombotree");
//$R("portalId", "layout/portallist?type=1");
//$R("channelId", "Course/CourseChannelComboTree");

$R("platformId", [
    { href: 1, text: "ss" }
]);
$R("portalId", [
    { href: 1, text: "ss" }
]);
$R("channelId", [
    { href: 1, text: "ss" }
]);


$("body").on("change", ".y_batchcheckbox", function () {
    var _this = $(this);
    if (this.checked) {
        $("#courseBody .row-check").each(function (i, v) {
            v.checked = true;
            var key = $(v).attr("tmpt-bind");
            rowData[key] = $dom.getBind(key);
        });
        $("#courseBody tr").addClass("selected");
    }
    else {
        $("#courseBody .row-check").attr("checked", false);
        $("#courseBody tr").removeClass("selected");
        rowData = {};
    }
});
$("body").on("change", ".row-check", function () {
    var _this = $(this);
    if (this.checked) {
        _this.parents("tr").addClass("selected");
        var key = _this.attr("tmpt-bind");
        rowData[key] = $dom.getBind(key);
    }
    else {
        _this.parents("tr").removeClass("selected");
        var key = _this.attr("tmpt-bind");
        delete rowData[key];
    }
});

$("body").on("click", "#search", function () {
    $dom.setBind();
    rowData = {};
    tablePagingPartJump("DataTables_Table_1_wrapper", 1, 10);
});
$("body").on("click", "#submit", function () {
    postData.ListData = [];
    for (var i in rowData) {
        postData.ListData.push(rowData[i]);
    }
    postData.ListData = postData.ListData.sort(function (a, b) { a.$id - b.$id });
    console.log("data", postData);
});