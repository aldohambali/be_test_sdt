const config = require('../configs/database');
const mysql = require('mysql');
const pool = mysql.createPool(config);

pool.on('error',(err)=> {
    console.error(err);
});

module.exports ={
    // get all users
    getDataUsers(req,res){
        pool.getConnection(function(err, connection) {
            if (err) throw err;
            connection.query(
                `
                SELECT a.id_users, a.first_name, a.last_name, a.email , a.timezone, (select (DATE_FORMAT(celebration.date_celebration, '%Y/%m/%d')) from celebration where celebration.id_messages='1' and celebration.id_users = a.id_users) as birthday, (select(DATE_FORMAT(celebration.date_celebration, '%Y/%m/%d')) from celebration where celebration.id_messages='2' and celebration.id_users = a.id_users) as anniversary FROM users a LEFT JOIN celebration b  ON a.id_users = b.id_users group by a.id_users;
                `
            , function (error, results) {
                if(error) throw error;  
                res.send({ 
                    success: true, 
                    message: 'Success get data!',
                    data: results
                });
            });
            connection.release();
        })
    },
    // get users by id
    getDataUsersByID(req,res){
        let id = req.params.id;
        pool.getConnection(function(err, connection) {
            if (err) throw err;
            connection.query(
                `
                SELECT a.first_name, a.last_name, a.email , a.timezone, (select (DATE_FORMAT(celebration.date_celebration, '%Y/%m/%d')) from celebration where celebration.id_messages='1' and celebration.id_users = a.id_users) as birthday, (select(DATE_FORMAT(celebration.date_celebration, '%Y/%m/%d')) from celebration where celebration.id_messages='2' and celebration.id_users = a.id_users) as anniversary FROM users a LEFT JOIN celebration b  ON a.id_users = b.id_users WHERE a.id_users=? GROUP BY a.id_users;
                `
            , [id],
            function (error, results) {
                if(error) throw error;  
                res.send({ 
                    success: true, 
                    message: 'Success get data!',
                    data: results[0]
                });
            });
            connection.release();
        })
    },
    // Add users
    // sample data
    // {
    //     "first_name":"test",
    //     "last_name":"last",
    //     "email":"test@test.com",
    //     "timezone":"Africa/Banjul",
    //     "birhtday":"1987-03-20",
    //     "anniversary":"1988-12-12"
    // }
    addDataUsers(req,res){
        console.log('post add users');
        console.log('post add users :: ',req.body);
        if(!req.body.first_name || !req.body.last_name || !req.body.email || !req.body.timezone || !req.body.birthday){
        res.send({ 
            success: false, 
            message: 'Please fill required data',
        });
        return;
        }




        let dataUsers = {
            first_name : req.body.first_name,
            last_name : req.body.last_name,
            email : req.body.email,
            timezone : req.body.timezone
        }
        
        pool.getConnection(function(err, connection) {
            if (err) throw err;
            connection.query(
                `
                INSERT INTO users SET ?;
                `
            , [dataUsers],
            function (error, results) {
                if(error) throw error;  
                console.log('insertdID : '+results.insertId);

                let dataBirthday = {
                    id_users : results.insertId,
                    id_messages : 1,
                    date_celebration : req.body.birthday
                }
                
                connection.query(`INSERT INTO celebration SET ?;`, [dataBirthday], function(err, rows, fields) {
                    if (err) throw err;
                });

                if(req.body.anniversary){
                    let dataAnniversary = {
                        id_users : results.insertId,
                        id_messages : 2,
                        date_celebration : req.body.anniversary
                    }     
                    connection.query(`INSERT INTO celebration SET ?;`, [dataAnniversary], function(err, rows, fields) {
                        if (err) throw err;
                    });
                }


            });
            connection.release();
        })

        res.send({ 
            success: true, 
            message: 'Success insert data!'
        });
    },
    // Update users
    // sample data
    // {
    //     "first_name":"test",
    //     "last_name":"last",
    //     "email":"test@test.com",
    //     "timezone":"Africa/Banjul",
    //     "birhtday":"1987-03-20",
    //     "anniversary":"1988-12-12"
    //     "id:"5"
    // }
    editDataUsers(req,res){

        let idUser = req.body.id
        if(!idUser){
            res.send({ 
                success: false, 
                message: 'Please fill required data',
            });
            return
        }

        pool.getConnection(function(err, connection) {
            if (err) throw err;
            let dataEdit = {
                first_name : req.body.first_name,
                last_name : req.body.last_name,
                email : req.body.email,
                timezone : req.body.timezone
            }
            connection.query(`UPDATE users SET ? WHERE id_users = ?;`, [dataEdit,idUser], function(err, rows, fields) {if (err) throw err;});
            console.log('UPDATE users')
            if(req.body.birthday){
                let dataBirthday = {
                    date_celebration : req.body.birthday
                }
                let idBirthday = 1
                connection.query(`UPDATE celebration SET ? WHERE id_users = ? and id_messages= ?;`, [dataBirthday,idUser,idBirthday], function(err, rows, fields) {
                    if (err) throw err;
                    console.log('UPDATE celebration 1')
                });
                
            }
            if(req.body.anniversary){
                
                let dataAnniversary = {
                    date_celebration : req.body.anniversary
                }   
                let idAnniversary = 2

                connection.query(`UPDATE celebration SET ? WHERE id_users = ? and id_messages= ?;`, [dataAnniversary,idUser,idAnniversary], function(err, rows, fields) {
                    if (err) throw err;
                    console.log('UPDATE celebration 2')
                });
                
            }




            connection.release();
        })
        
        res.send({ 
            success: true, 
            message: 'Success edit data!',
        });


    },
    // Delete users
    // sample data
    // {
    //     "id:"5"
    // }
    deleteDataUsers(req,res){
        let id = req.body.id
        pool.getConnection(function(err, connection) {
            if (err) throw err;
            connection.query(
                `
                DELETE FROM users WHERE id_users = ?;
                `
            , [id],
            function (error, results) {
                if(error) throw error;  
                console.log('DELETE users')
                // let dataAnniversary = {
                //     date_celebration : req.body.anniversary
                // }   
                // let idAnniversary = 2

                connection.query(`DELETE FROM celebration WHERE id_users = ?;`, [id], function(err, rows, fields) {
                    if (err) throw err;
                    console.log('DELETE celebration')
                });
                
                
            });
            connection.release();
        })

        res.send({ 
            success: true, 
            message: 'Success remove data!'
        });

    }
}