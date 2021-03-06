/**search.js
 * Copyright (c) USThing 2017
 * 
 * Author: Dipsy Wong(dipsywong98)
 * Created on 2017-08-25
 * 
 * Get the locations with longest available time since certain day certain time until 0000AM
 * 
 * GET
 * |weekday | interested weekday | 
 * |time    | start time
 * 
 */

var request = require('request');
const cheerio = require('cheerio');
var fs = require('fs');
var moment = require('moment');
var express = require('express');
var router = express.Router();
var app = express();

var URL_courses_and_locations = 'https://drive.google.com/uc?export=download&id=0B2wxG8U_9xycUVB2RGRoU215bTA';
var availablily = {};


app.get('/',function (req, res){
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
    res.setHeader('Access-Control-Allow-Credentials', true);
    request(URL_courses_and_locations, function (error, response, body) {
        availability = JSON.parse(body);
        
        console.log(req.query);

        var weekday = Number(req.query.weekday) || 0;
        var time = Number(req.query.time) || 8;
        var rooms_list_by_time = SearchRoom(weekday,time);
        res.send({
            'query':{
                'weekday':weekday,
                'time':time
            },
            'result':rooms_list_by_time
        });
    })
    // console.log('hi');
})
app.listen(3000);
/**
 * return a object containing different length of time have available room
 * {
 *      <length_of_available_time>:[list of available locations]
 * }
 * @param {search target day} search_day 
 * @param {search start time, [8 .. 23.5]} search_time 
 */
function SearchRoom(search_day, search_time){
    var day = availability[search_day];
    var possible_locations = day[search_time];
    var time = search_time+.5;
    var loc_by_length = {};
    while(possible_locations.length>0 && time<24){
        var i=0
        while(i<possible_locations.length){
            var index = day[time].indexOf(possible_locations[i]);
            if(index == -1){
                if(!(time-search_time in loc_by_length)){
                    loc_by_length[time-search_time] = [];
                }
                loc_by_length[time-search_time].push(possible_locations.splice(i,1)[0])
            }
            else{
                i++;
            }
        }
        time+=0.5;
    }
    if(time==24){
        loc_by_length[time-search_time] = possible_locations;
    }
    console.log(JSON.stringify(loc_by_length,null,2));
    return loc_by_length;
}