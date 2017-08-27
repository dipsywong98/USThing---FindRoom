
/**index.js
 * Copyright (c) USThing 2017
 * 
 * Author: Dipsy Wong(dipsywong98)
 * Created on 2017-08-24
 * 
 * Generator of all courses json this semester
 * 
 * output files: 
 * courses.json (all courses), 
 * locations.json (all classroom which have courses), 
 * all.json (combine of the previous two)
 * 
 * output structure:
 * 
 * courses[
 *   course{
 *      title
 *      heading{
 *          full_code,
 *          department,
 *          code,
 *          name,
 *          credit
 *      }
 *      sections[
 *          name:
 *          description:{   //its content is dynamic, some index may not exist
 *              ATTRIBUTES,
 *              EXCLUSION,
 *              CO-REQUISITE,
 *              PRE-REQUISITE,
 *              DESCRIPTION,
 *          }
 *          classes:[
 *              class{
 *                  start_time
 *                  end_time
 *                  location
 *          }]
 *      ]
 *   }]
 * 
 * 
 */

var request = require('request');
const cheerio = require('cheerio');
var fs = require('fs');
var moment = require('moment');
moment().format();

var links = [];
var courses_dict = {};
var all_courses = [];
var locations = [];
var load_sum = 0;
var $;

// var days = ["Mo","Tu","We","Th","Fr","Sa","Su"];
var days = {
    Su:"Sunday",
    Mo:"Monday",
    Tu:"Tuesday",
    We:"Wednesday",
    Th:"Thursday",
    Fr:"Friday",
    Sa:"Saturday"
}

var start_end_date = {
    fall:{
        start:"09-01",
        end:"11-30"
    },
    spring:{
        start:"02-01",
        end:"05-09"
    }
};
 var year;
 var semester;
 var start_date;
 var end_date;

function GetInnerText(element){
    if(!element) return "ignored";
    var str = '';
    for(var i=0; i<element.children.length; i++){
        if(element.children[i].data) str += element.children[i].data
        else str += '|';
    }
    return str;
}

function StrContain(str1, str2){
    return str1.indexOf(str2) !== -1;
}

request('https://w5.ab.ust.hk/wcq/cgi-bin/1710/', function (error, response, body) {
    
    $ = cheerio.load(body);

    var semester_str = GetInnerText($('a[href="#"]')[0]);
    [year,semester] = semester_str.split(' ');
    if(semester.indexOf('Fall') === -1){
        year = year.split('-')[0];
    }
    else{
        year = '20'+year.split('-')[1];
    }

    GetCourseLinks();
    console.log(links);
    for(var i=0; i<links.length; i++){
        PushCoursesByURL(links[i]);
    }
    
    //  PushCoursesByURL('https://w5.ab.ust.hk/wcq/cgi-bin/1710/');
    
});

 function GetCourseLinks(){
    var anchors = $('a.ug');
    for (var i=0; i<anchors.length; i++){
        links.push("https://w5.ab.ust.hk"+anchors[i].attribs.href);
    }
    var anchors = $('a.pg');
    for (var i=0; i<anchors.length; i++){
        links.push("https://w5.ab.ust.hk"+anchors[i].attribs.href);
    }
 }

function PushCoursesByURL(url){
    request(url ,function (error ,response ,body){  

        $ = cheerio.load(body);

        var raw_courses = $('div.course');

        //for each course in courses
        for(var i=0; i<raw_courses.length; i++){
            var raw_course = $(raw_courses[i]); 
            var sections = raw_course.find('tr').filter('[class!=""]');
            var course = {
                title: GetInnerText(raw_course.find('h2')[0]),
                heading:BuildHeading(GetInnerText(raw_course.find('h2')[0])),
                details:BuildDetails($(raw_course.find('.courseinfo')[0]).find('tbody')),
                sections: BuildSections(sections)
            };
            all_courses.push(course);
            courses_dict[course.heading.full_code] = course;

        }

        //loaded all courses
        if(++load_sum>=links.length){
            fs.writeFile("courses.json", JSON.stringify({courses:all_courses}), function(err) {
                if(err) {
                    return console.log(err);
                }
                console.log("The file was saved!");
            }); 
            fs.writeFile("locations.json", JSON.stringify({locations:locations}), function(err) {
                if(err) {
                    return console.log(err);
                }
                console.log("The file was saved!");
            }); 
            fs.writeFile("all.json", JSON.stringify({courses:all_courses,locations:locations}), function(err) {
                if(err) {
                    return console.log(err);
                }
                console.log("The file was saved!");
            }); 
            // console.log(all_courses);
        }
    })
}

function BuildSections(raw_sections){
    var sections = [];
    //for each sections(tr)
    for(var i=0; i<raw_sections.length; i++){
        //get its detials (td)
        var details = $(raw_sections[i]).find('td');
        if(StrContain(raw_sections[i].attribs.class,'newsect')){
            //new section 
            sections.push({
                name:GetInnerText(details[0]),
                classes:[]
            })
        }
        else{
            //if it is extened row for previous section
            details.splice(0,0,"");
        }
        var section = sections[sections.length-1];
        var _classes = BuildClasses(section,details);
        if(_classes == "TBA"){
            section.classes="TBA";
        }
        else{
            while(_classes.length>0){
                section.classes.push(_classes.pop());
            }
        }
        
    }
    return sections;
}

function BuildClasses(section,details){
    var classes=[];
    var time_str = GetInnerText(details[1]);
    var location = GetInnerText(details[2]);
    var note="N/A";
    var start_time = 0;
    var end_time = 0;

    //record new locations
    if(location!="TBA"&&locations.indexOf(location)==-1){
        locations.push(location);
    }

    //no class
    if(time_str=="TBA"&&location=="TBA"){
        return "TBA";
    }

    //split the date constrain and time
    if(StrContain(time_str,"|")){
        [note,stime_str] = time_str.split("|");
    }

    //split the week days
    for(var day in days){
        time_str = time_str.replace(day," "+day);
    }
    time_strs = time_str.split(" ");
    // console.log(time_strs);
    // console.log(time_strs);

    for(var i=time_strs.length-1; i>0; --i){
        var str = time_strs[i];
        if(StrContain("MoTuWeThFrSaSu",str)){
            //talking about week days
            classes.push({
                day:days[str],
                start_time: moment(start_time,'hh:mma'),
                end_time: moment(end_time,'hh:mma'),
                location: location,
                note: note
            });
        }
        if(StrContain(str,":")){
            if(end_time == 0) end_time = str;
            else start_time = str;
        }
    }
    // console.log(classes);
    return classes;
}

function BuildDetails(raw_info){
    details = {};
    var raw_details = $(raw_info).find('tr');
    for(var i=0; i<raw_details.length; i++){
        var td = $($(raw_details)[i]).find('td')[0];
        var th = $($(raw_details)[i]).find('th')[0];
        if(GetInnerText(th).split('|').length>1) continue;
        details[GetInnerText(th)] = GetInnerText(td);
    }
    return details;
}

function BuildHeading(h2_str){
    var course_code = h2_str.split(' - ')[0];
    var course_name = h2_str.split(/[A-Z]{4} [0-9]{4}[A-Z]* - /g)[1];
    console.log(course_code, " ", course_name);
    var [department,code] = course_code.split(' ');
    var [name,credit] = course_name.split(' (');
    credit = credit.split(' unit')[0];
    return {
        id:course_code.split(' ').join(''),
        department:department,
        code:code,
        name:name,
        credit:credit
    }
}