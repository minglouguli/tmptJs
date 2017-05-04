;
var headList = [{
    Name: "课程名称",
    Code: "Name"
}, {
    Name: "课程编码",
    Code: "Code"
}, {
    Name: "课程助记码",
    Code: "NickName"
}, {
    Name: "图片",
    Code: "Img"
}, {
    Name: "缩略图",
    Code: "Thumbnail"
}, {
    Name: "讲师",
    Code: "Teacher"
}, {
    Name: "职称",
    Code: "JobTitle"
}
    //, {
    //    Name: "课程类型",
    //    Code: "Type"
    //}, {
    //    Name: "课程标准",
    //    Code: "Standards"
    //}, {
    //    Name: "课程介绍",
    //    Code: "Description"
    //}, {
    //    Name: "课程时长",
    //    Code: "Duration"
    //}, {
    //    Name: "课程大小",
    //    Code: "CourseSize"
    //}
];

var getDate = function (page, rows) {
    var courseList = [];
    for (var i = 1 + (page - 1) * rows; i < page * rows + 1; i++) {
        var course = {};
        var duration = Math.random().toFixed(2);
        courseList.push({
            Code: "C000" + i,
            Name: "课程" + i,
            NickName: "",
            Img: "12324325345.jpg",
            Thumbnail: "12324325345.jpg",
            Teacher: "老师" + i,
            JobTitle: "职称",
            Type: "ThreeScreenCourse",
            Standards: "JYAicc",
            Description: "课程介绍" + i,
            Duration: duration,
            CourseSize: duration * 99 + "M"
        });
    }
    return courseList;
};

