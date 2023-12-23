const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const nodeCron = require('node-cron');

var moment = require('moment-timezone');

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())

const usersRoute = require('./src/routes/route-users');
app.use('/api/', usersRoute);

var cron = require('node-cron');

require('dotenv').config();


// run cron every hour
// 0 * * * * = every houre at minute 0
// var task = cron.schedule("*/5 * * * * *", () => { //dev test 5 sec
var task = cron.schedule("0 * * * *", () => { 
    console.log("running a task every hour");
    console.log("-------");

    const config = require('./src/configs/database');
    const mysql = require('mysql');
    const pool = mysql.createPool(config);
    
    // get today and tommorow bithday from unix utc time
    pool.getConnection(function(err,connection) {
        if (err) throw err;

        //query today and tommorow celebration
        connection.query("SELECT (DATE_FORMAT(b.date_celebration, '%m%d')) as mmdd_user, (DATE_FORMAT(CURDATE(), '%m%d')) as mmdd_system,(DATE_FORMAT(CURDATE() + INTERVAL 1 DAY, '%m%d')) as mmddplusone_system, a.first_name, a.last_name, a.email , a.timezone, b.date_celebration, c.title, c.messages FROM users a, celebration b, messages c where a.id_users = b.id_users and c.id_messages= b.id_messages and (DATE_FORMAT(b.date_celebration, '%m%d') = DATE_FORMAT(CURDATE(), '%m%d') or DATE_FORMAT(b.date_celebration, '%m%d') = DATE_FORMAT(CURDATE() + INTERVAL 1 DAY, '%m%d'))" , function (err, result, fields) {
          if (err) throw err;
          console.log(result);
          // check time on timezone if 09.00 and date on timezone, if match with celebration then send email
          result.forEach(element => {

            var today_user_time = moment().tz(element.timezone).hours()
            console.log("user_time: ",today_user_time); 

            var today_user_date = moment().tz(element.timezone).format('MMDD')
            console.log("user_date: ",today_user_date); 

            var user_celebration = moment(element.date_celebration).format('MMDD')
            

            if(today_user_time== 9 && today_user_date==user_celebration){
                // send email
                var premsg = element.messages;
                var msg = premsg.replace("{name}", element.first_name+' '+element.last_name);
                
                var prettl = element.title;
                var ttl = prettl.replace("{name}", element.last_name+' '+element.last_name);

                let req = {
                    title:  ttl,
                    message: msg,
                    email : element.email
                }
                console.log(`prepare Message: `+JSON.stringify(req))
                try {
                    sendEmail(req);
                    //stamp success logs in log history folder
                    console.log(`Message send: `+JSON.stringify(req))

                 } catch (err) {
                    //insert db notification [error email only]
                    let errordata = {
                        date : element.date_celebration,
                        email : element.email,
                        title : ttl,
                        message : msg
                    }
                    submitError(errordata);
                    console.log(`Message error: `+JSON.stringify(err))
                 }


            }

          });
        });
    });
    
    pool.on('error',(err)=> {
        console.error(err);
    });
        
});

task.start();


function sendEmail(req) {
    // console.log('sendEmail :: '+JSON.stringify(req))
    // return true;

    const email = req.email;
    const msg = req.message;
    const subject = req.title;

    // const transporter = nodemailer.createTransport({
    //     host: 'smtp.gmail.com',
    //     port: 587,
    //     secure: false,
    //     service: 'gmail',
    //     auth: {
    //         user: process.env.SENDER_EMAIL,
    //         pass: process.env.SENDER_PASSWORD,
    //     }
    // });

    const transporter = nodemailer.createTransport({
        host: 'smtp.mail.yahoo.com',
        port: 465,
        service:'yahoo',
        secure: false,
        auth: {
            user: process.env.SENDER_EMAIL,
            pass: process.env.SENDER_PASSWORD,
        },
        debug: false,
        logger: true 
    });


    const mailOptions = {
        from: process.env.SENDER_EMAIL,
        to: email,
        subject: subject,
        text: `${msg}`
    };

    return transporter.sendMail(mailOptions);
}

function submitError(data){
    const config = require('./src/configs/database');
    const mysql = require('mysql');
    const pool = mysql.createPool(config);

    pool.getConnection(function(err, connection) {
        if (err) throw err;
        connection.query(
            `
            INSERT failed_notifications SET ?;
            `
        , [data],
        function (error, results) {
            if(error) throw error;  
            console.log(`failed_notifications added: `+JSON.stringify(data))
        });
        connection.release();
    })
    pool.on('error',(err)=> {
        console.error(err);
    });
}

//cron failed send email
var cronResend = cron.schedule("45 1 * * *", () => { 
    console.log("running a task 01.45");
    console.log("-------");

    const config = require('./src/configs/database');
    const mysql = require('mysql');
    const pool = mysql.createPool(config);
    
    pool.getConnection(function(err,connection) {
        if (err) throw err;
        //query all failed email
        connection.query("SELECT * from failed_notifications" , function (err, result, fields) {
          if (err) throw err;
          console.log(result);
          result.forEach(element => {
                // send email
                let req = {
                    title:  element.title,
                    message: element.message,
                    email : element.email
                }
                console.log(`prepare Message: `+JSON.stringify(req))
                try {
                    sendEmail(req);
                    //stamp success logs in log history folder
                    console.log(`Message send: `+JSON.stringify(req))
                    //remove from db notification
                    removeNotification(element.id_notification);
                 } catch (err) {
                    // error on resend email
                    console.log(`Resend error: `+JSON.stringify(err))
                 }
          });
        });
    });
    
    pool.on('error',(err)=> {
        console.error(err);
    });

});
cronResend.start();

function removeNotification(id){
    const config = require('./src/configs/database');
    const mysql = require('mysql');
    const pool = mysql.createPool(config);

    pool.getConnection(function(err, connection) {
        if (err) throw err;
        connection.query(
            `
            DELETE FROM failed_notifications WHERE id_notification = ?;
            `
        , [id],
        function (error, results) {
            if(error) throw error;  
            console.log(`Remove failed_notifications id_notification  : `+JSON.stringify(id))
        });
        connection.release();
    })
    pool.on('error',(err)=> {
        console.error(err);
    });
}



app.listen(8080, ()=>{
    console.log('Server Berjalan di Port : 8080');
});