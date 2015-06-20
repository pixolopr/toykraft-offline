//VARIABLES NEEDED
//var adminurl = "http://admin.toy-kraft.com/rest/index.php/";
var adminurl = "http://localhost/NetworkBackend/rest/index.php/";
var zone;

//CREATE THE DATABASE
var db = openDatabase('toykraftapp2', '1.0', 'toykraftapp DB', 50 * 1024 * 1024);

//CREATE ALL TABLES
db.transaction(function (tx) {
    tx.executeSql('CREATE TABLE IF NOT EXISTS ZONE (id Integer PRIMARY KEY, name, email)');
    //tx.executeSql("DROP TABLE ZONE");
    tx.executeSql('CREATE TABLE IF NOT EXISTS USERS (id Integer PRIMARY KEY, name varchar, password varchar, username varchar, email varchar, mobile varchar, accesslevel Integer, zone Integer, lastlogin TIMESTAMP)');
    //tx.executeSql('DROP TABLE USERS');
});
db.transaction(function (tx) {
    tx.executeSql('INSERT INTO `USERS` VALUES(1,"abc","toykraft","toykraft","","","","","")')
})
var mydatabase = angular.module('mydatabase', [])
    .factory('MyDatabase', function ($http, $location, MyServices) {


        var orderproductcount = 0;
        var ordersynccount = 0;

        return {
            //ORDER SYNC
            getordersynccount: function () {
                return ordersynccount;
            },
            setordersynccount: function () {
                db.transaction(function (tx) {
                    tx.executeSql('SELECT COUNT(*) as `number` FROM ORDERS WHERE `issync` = 0', [], function (tx, results) {
                        console.log(results.rows.item(0).number)
                        ordersynccount = results.rows.item(0).number;
                    }, function (tx, results) {
                        console.log(results);
                    })
                });
            },
            syncorders: function (scope) {
                user = MyServices.getuser();

                console.log("sync orders");

                var apply = function(sc)
                {
                    sc.$apply();
                };
                
                //SYNC SUCCESS
                var syncordersuccess = function (id, ordersid) {
                    console.log(id + " " + ordersid);
                    db.transaction(function (tx) {
                        console.log("sync value change");
                        tx.executeSql('UPDATE `ORDERS` SET `id`='+id+',`issync`= 1 WHERE `id`=' +ordersid, [], function (tx, results) {
                            console.log(results.rows);
                            //angular.element(document.getElementById('syncCtrl')).scope().$apply();
                            scope.$apply();
                            apply(scope);
                            scope.callbacksuccess();
                        }, function (tx, results) {});
                    });
                };

                //SYNC TO ONLINE
                var syncordernow = function (cart, retaildata) {
                    return $http.post(adminurl + "orders/makeorder", {
                        cart: cart,
                        user: user,
                        retailer: retaildata,
                    });
                };

                //RETAINING CART
                var getcart = function (oid, rd) {
                    console.log("retaining cart");
                    db.transaction(function (tx) {
                        tx.executeSql('SELECT * FROM `orderproduct` WHERE `orders` = ' + oid, [], function (tx, results) {
                            var synccart = [];
                            for (var gc = 0; gc < results.rows.length; gc++) {
                                synccart[gc] = {};
                                synccart[gc].category = results.rows.item(gc).category;
                                synccart[gc].id = results.rows.item(gc).product;
                                synccart[gc].mrp = results.rows.item(gc).amount;
                                synccart[gc].name = results.rows.item(gc).name;
                                synccart[gc].productcode = results.rows.item(gc).productcode;
                                synccart[gc].quantity = results.rows.item(gc).quantity;
                                synccart[gc].totalprice = results.rows.item(gc).quantity * results.rows.item(gc).amount;
                            };
                            console.log(synccart);
                            syncordernow(synccart, rd).success(function (data, status) {
                                syncordersuccess(data.id, oid)
                            });
                        }, function (tx, results) {});
                    });
                };

                //RETAINING RETAILER
                var getretailer = function (orderid, retailerid, remark) {
                    console.log("retaining retailer");
                    db.transaction(function (tx) {
                        tx.executeSql('SELECT * FROM `RETAILER` WHERE `id` = ' + retailerid, [], function (tx, results) {
                            console.log(results.rows);
                            var retailerdata = {};
                            retailerdata = results.rows.item(0);
                            retailerdata.remark = remark;
                            getcart(orderid, retailerdata);
                        }, function (tx, results) {
                            console.log(results);
                        });
                    });
                };

                //RETAINING ORDER
                db.transaction(function (tx) {
                    console.log("retaining order");
                    tx.executeSql('SELECT * FROM `orders` WHERE `issync` = 0', [], function (tx, results) {
                        console.log(results.rows);
                        for (var os = 0; os < results.rows.length; os++) {
                            console.log(results.rows.item(os).id + " " + results.rows.item(os).retail + " " + results.rows.item(os).remark)
                            getretailer(results.rows.item(os).id, results.rows.item(os).retail, results.rows.item(os).remark);
                        };
                    }, function (tx, results) {});
                });
            },

            //SYNC ZONE DATA
            findzonebyuser: function () {
                return $http.get(adminurl + "zone/find", {
                    params: {
                        user: user
                    }
                });
            },
            addzonedata: function (data) {
                db.transaction(function (tx) {
                    for (var i = 0; i < data.length; i++) {
                        var sqls = 'INSERT INTO ZONE (id , name, email) VALUES (' + data[i].id + ',"' + data[i].name + '","' + data[i].email + '")';
                        tx.executeSql(sqls, [], function (tx, results) {}, null);
                    };
                });
            },

            //FINDING ZONE OF USER
            findzonebyuseroffline: function () {
                zone = user.zone;
            },

            //CREATING ALL TABLES ON SYNC PAGE LOAD
            createretailertables: function () {
                db.transaction(function (tx) {
                    tx.executeSql('CREATE TABLE IF NOT EXISTS STATE (id Integer PRIMARY KEY, zone Varchar, name Varchar)');
                    //   tx.executeSql('DROP TABLE STATE');

                });
                db.transaction(function (tx) {
                    tx.executeSql('CREATE TABLE IF NOT EXISTS CITY (id Integer PRIMARY KEY, state Integer, name Varchar)');
                    //   tx.executeSql('DROP TABLE CITY');

                });
                db.transaction(function (tx) {
                    tx.executeSql('CREATE TABLE IF NOT EXISTS AREA (id Integer PRIMARY KEY, city Integer, name Varchar, distributor Integer)');
                    //  tx.executeSql('DROP TABLE AREA');

                });
                db.transaction(function (tx) {
                    tx.executeSql('CREATE TABLE IF NOT EXISTS RETAILER (id INTEGER PRIMARY KEY ,lat Integer,long Integer,area int,dob Date ,type_of_area Integer,sq_feet Float,store_image Varchar,name Varchar,number Varchar,email Varchar,address Varchar,ownername Varchar,ownernumber Varchar,contactname Varchar,contactnumber Varchar,timestamp TIMESTAMP, issync Integer)');
                    // tx.executeSql('DROP TABLE RETAILER');
                });
                db.transaction(function (tx) {
                    tx.executeSql('CREATE TABLE IF NOT EXISTS PRODUCT (id INTEGER PRIMARY KEY AUTOINCREMENT, name Varchar, product Varchar, encode Varchar, name2 Varchar, productcode Varchar, category Integer,video Varchar,mrp,description VARCHAR2(5000),age Integer,scheme Varchar,isnew Integer,timestamp Timestamp)');
                    // tx.executeSql('DROP TABLE PRODUCT');
                });
                db.transaction(function (tx) {
                    tx.executeSql('CREATE TABLE IF NOT EXISTS ORDERS (id INTEGER PRIMARY KEY, retail Integer,sales Varchar,timestamp Timestamp,amount double,signature integer,salesid Integer,quantity Integer,remark text,issync integer)');
                    //tx.executeSql('DROP TABLE ORDERS');
                });
                db.transaction(function (tx) {
                    tx.executeSql('CREATE TABLE IF NOT EXISTS TOPTEN (product INTEGER, productcode, name, totalquantity)');
                    //   tx.executeSql('DROP TABLE TOPTEN');
                });
                db.transaction(function (tx) {
                    tx.executeSql('CREATE TABLE IF NOT EXISTS ORDERPRODUCT (id Integer PRIMARY KEY, orders Integer, product Integer, quantity Integer,name varchar, amount double, scheme_id Integer, status Integer, category varchar, productcode varchar)');
                    //tx.executeSql('DROP TABLE ORDERPRODUCT ');
                });
                db.transaction(function (tx) {
                    tx.executeSql('CREATE TABLE IF NOT EXISTS PRODUCTIMAGE (id Integer PRIMARY KEY, product Integer, image varchar)');
                    //  tx.executeSql('DROP TABLE PRODUCTIMAGE');
                });

            },

            //STATE SYNC
            syncinretailerstatedata: function () {
                return $http.get(adminurl + "state/find", {
                    params: {}
                })
            },
            insertretailerstatedata: function (data) {
                db.transaction(function (tx) {
                    for (var i = 0; i < data.length; i++) {
                        var sqls = 'INSERT INTO STATE (id , zone, name) VALUES (' + data[i].id + ',"' + data[i].zone + '","' + data[i].name + '")';
                        tx.executeSql(sqls, [], function (tx, results) {}, null);
                    };
                    //$cordovaToast.show('States Data Imported', 'long', 'bottom');
                });
            },

            //CITY SYNC
            syncinretailercitydata: function () {
                return $http.get(adminurl + "city/find", {
                    params: {}
                })
            },
            insertretailercitydata: function (data) {
                db.transaction(function (tx) {
                    for (var i = 0; i < data.length; i++) {
                        var sqls = 'INSERT INTO CITY (id , state, name) VALUES (' + data[i].id + ',"' + data[i].state + '","' + data[i].name + '")';
                        console.log(sqls);
                        tx.executeSql(sqls, [], function (tx, results) {
                            console.log("RAOW INSERTED");
                        }, null);
                    };
                    //$cordovaToast.show('City Data Imported', 'long', 'bottom');
                });
            },

            //AREA SYNC
            syncinretailerareadata: function () {
                return $http.get(adminurl + "area/find", {
                    params: {}
                })

            },
            insertretailerareadata: function (data) {
                db.transaction(function (tx) {
                    for (var i = 0; i < data.length; i++) {
                        var sqls = 'INSERT INTO AREA (id , city, name,distributor) VALUES (' + data[i].id + ',' + data[i].city + ',"' + data[i].name + '",' + data[i].distributor + ')';
                        console.log(sqls);
                        tx.executeSql(sqls, [], function (tx, results) {
                            console.log("RAOW INSERTED");
                        }, null);
                    };

                });
            },

            //PRODUCTIMAGE SYNC
            syncinproductimagedata: function () {
                return $http.get(adminurl + "productimage/find", {
                    params: {}
                })

            },
            insertproductimagedata: function (data) {
                db.transaction(function (tx) {
                    for (var i = 0; i < data.length; i++) {
                        var sqls = 'INSERT INTO PRODUCTIMAGE (id , product, image) VALUES (' + data[i].id + ',"' + data[i].product + '","' + data[i].image + '")';

                        tx.executeSql(sqls, [], function (tx, results) {
                            console.log("RAOW INSERTED");
                        }, null);
                    };

                });
            },



            updatecitydata: function (data) {
                db.transaction(function (tx) {
                    for (var i = 0; i < data.length; i++) {
                        var sqls = 'UPDATE CITY SET id = ' + data[i].id + ', state = "' + data[i].state + '", name = "' + data[i].name + '" WHERE id = ' + data[i].id;

                        tx.executeSql(sqls, [], function (tx, results) {
                            console.log("RAOW UPDATED");
                        }, null);
                    };
                });
            },
            //RETAILER SYNC
            syncinretailerdata: function () {
                return $http.get(adminurl + "retailer/find", {
                    params: {}
                })
            },

            insertretailerdata: function (data) {
                db.transaction(function (tx) {
                    for (var i = 0; i < data.length; i++) {
                        var sqls = 'INSERT INTO RETAILER (id,lat,long,area,dob,type_of_area,sq_feet,store_image,name,number,email,address,ownername,ownernumber,contactname,contactnumber,timestamp, issync) VALUES ("' + data[i].id + '","' + data[i].lat + '","' + data[i].long + '","' + data[i].area + '","' + data[i].dob + '","' + data[i].type_of_area + '","' + data[i].sq_feet + '","' + data[i].store_image + '","' + data[i].name + '","' + data[i].number + '","' + data[i].email + '","' + data[i].address + '","' + data[i].ownername + '","' + data[i].ownernumber + '","' + data[i].contactname + '","' + data[i].contactnumber + '","' + data[i].timestamp + '",0)';

                        tx.executeSql(sqls, [], function (tx, results) {
                            console.log("RAOW INSERTED");
                        }, function (tx, results) {
                            console.log("RAOW NOT INSERTED");
                        });
                    };
                    //$cordovaToast.show('Retailer Data Imported', 'long', 'bottom');
                });
            },




            //PRODUCT SYNC
            syncinproductdata: function () {
                return $http.get(adminurl + "product/find", {
                    params: {}
                })
            },
            insertproductdata: function (data) {
                db.transaction(function (tx) {
                    for (var i = 0; i < data.length; i++) {
                        var sqls = 'INSERT INTO PRODUCT (id, name, product, encode, name2, productcode, category,video,mrp,description,age,scheme,isnew,timestamp) VALUES (' + data[i].id + ',"' + data[i].name + '","' + data[i].product + '","' + data[i].encode + '","' + data[i].name2 + '","' + data[i].productcode + '","' + data[i].category + '","' + data[i].video + '","' + data[i].mrp + '","' + data[i].description + '","' + data[i].age + '","' + data[i].scheme + '","' + data[i].isnew + '","' + data[i].timestamp + '")';

                        tx.executeSql(sqls, [], function (tx, results) {
                            console.log("PRODUCT RAOW INSERTED");
                        }, function (tx, results) {
                            console.log("PRODUCT RAOW NOT INSERTED");
                        });
                    };
                    //$cordovaToast.show('Product Data Imported', 'long', 'bottom');
                });
            },

            //TOP TEN
            inserttopten: function (data) {
                db.transaction(function (tx) {
                    for (var i = 0; i < data.length; i++) {
                        var sqls = 'INSERT INTO TOPTEN (product, productcode, name, totalquantity) VALUES (' + data[i].product + ',"' + data[i].productcode + '","' + data[i].name + '","' + data[i].totalquantity + '")';
                        console.log(sqls);
                        tx.executeSql(sqls, [], function (tx, results) {
                            console.log("TOP TEN RAOW INSERTED");
                        }, function (tx, results) {
                            console.log("TOP TEN NOT INSERTED");
                        });
                    };
                    //$cordovaToast.show('Top Ten Data Imported', 'long', 'bottom');
                });
            },

            //SYNC CATEGORIES
            getcategoriesname: function () {
                return $http.get(adminurl + "catelog/getcatelog");
            },
            synccategorydata: function (data) {

            },


            findproductbycategory: function (id) {
                $http.get(adminurl + "", {
                    params: {
                        id: id
                    }
                })
            },


            sendcartoffline: function (retailerdata, user, ocart) {

                var finishofflineorder = function () {
                    orderproductcount = 0;
                    var aid = MyServices.getareaid();
                    MyServices.clearcart();
                    MyServices.setretailer(0);
                    if (aid > 0) {
                        window.location.replace(window.location.origin + window.location.pathname + "#/app/retailer/" + aid);
                    } else {
                        window.location.replace(window.location.origin + window.location.pathname + "#/app/home");
                    };
                };

                var addorderproducts = function (cartproduct, orderid, checkval) {
                    console.log(orderid);
                    db.transaction(function (tx) {

                        var sqls = 'INSERT INTO ORDERPRODUCT (orders, product, quantity, name, amount, scheme_id, status, category, productcode) VALUES (' + orderid + ', ' + cartproduct.id + ', ' + cartproduct.quantity + ', "' + cartproduct.name + '",' + cartproduct.mrp + ', 0, 1, "' + cartproduct.category + '", "' + cartproduct.productcode + '")';
                        console.log(sqls);

                        tx.executeSql(sqls, [], function (tx, results) {

                            orderproductcount++;
                            if (orderproductcount == checkval) {
                                finishofflineorder();
                            };
                        }, function (tx, results) {
                            console.log(results);
                            console.log('did not add no product with no name');
                        });
                        //$cordovaToast.show('Order Placed Offline', 'long', 'bottom');
                    });
                };

                var totalamount = 0;
                var totalquantity = 0;
                for (var c = 0; c < ocart.length; c++) {
                    totalquantity += ocart[c].quantity;
                    totalamount += ocart[c].totalprice;
                };

                db.transaction(function (tx) {

                    if (retailerdata.remark == undefined) {
                        retailerdata.remark = "No Remark";
                    };
                    var sqls = 'INSERT INTO ORDERS (retail ,sales, timestamp, amount, signature, salesid, quantity, remark, issync) VALUES (' + retailerdata.id + ', "' + user.name + '", "9:50", ' + totalamount + ' , 1 , ' + user.id + ', ' + totalquantity + ' , "' + retailerdata.remark + '", 0 )';

                    tx.executeSql(sqls, [], function (tx, results) {
                        var insertid = results.insertId;
                        console.log(insertid);
                        if (totalquantity > 0) {
                            //INSERT INTO ORDERPRODUCTS
                            for (c = 0; c < ocart.length; c++) {
                                addorderproducts(ocart[c], insertid, ocart.length);
                            };
                        } else {
                            finishofflineorder();
                        };
                    }, function (tx, results) {
                        console.log('did not add no product with no name');
                    });
                    //$cordovaToast.show('Order Placed Offline', 'long', 'bottom');
                });
            },
            syncsendorders: function (sqls, dsqls) {
                //function after email success
                var emailsend = function (data, status) {
                    console.log(data);
                };
                //funtion after sms success
                var smssuccess = function (data, status) {
                    console.log(data);
                };
                //function after the success of the syncing of the order
                var syncordersuccess = function (data, status) {
                    MyServices.sendorderemail(data.id, data.retail, data.amount, data.sales, data.timestamp, data.quantity, data.remark).success(emailsend);
                    db.transaction(function (tx3) {
                        tx3.executeSql(dsqls, [], function (tx3, results3) {
                            console.log(results3);
                            console.log(data);
                            $.jStorage.set("offlineorderid", $.jStorage.get("offlineorderid") - 1);
                        }, function (tx3, results3) {});
                    });
                };
                //user and retailer and cart variables
                var retaileridtosend = 0;
                var useridtosend, retailertosend, usertosend, remarktosend, totalq, totalp, number1, number2;
                var carttosend = [];
                var userme = MyServices.getuser();
                console.log(sqls);
                db.transaction(function (tx2) {
                    //selecting idividual orders
                    tx2.executeSql(sqls, [], function (tx2, results2) {
                        for (var i = 0; i < results2.rows.length; i++) {
                            //getting retailer id and the user id of the order
                            retaileridtosend = results2.rows.item(i).retailerid;
                            useridtosend = results2.rows.item(i).userid;
                            //remark of that order
                            remarktosend = results2.rows.item(i).remark;
                            //total quantity
                            totalq += results2.rows.item(i).quantity;
                            totalp += results2.rows.item(i).totalprice;
                            //creating the cart
                            if (results2.rows.item(i).id != null) {
                                carttosend.push({
                                    id: results2.rows.item(i).id,
                                    productcode: results2.rows.item(i).productcode,
                                    name: results2.rows.item(i).name,
                                    quantity: results2.rows.item(i).quantity,
                                    mrp: results2.rows.item(i).mrp,
                                    totalprice: results2.rows.item(i).totalprice,
                                    category: results2.rows.item(i).category
                                });
                            };
                        };
                        if (retaileridtosend == 0) {
                            $.jStorage.set("offlineorderid", $.jStorage.get("offlineorderid") - 1);
                        };
                        //checking if user is the current user
                        if (useridtosend == userme.id) {
                            //retrieving the retailer object
                            var rsqls = 'SELECT * FROM RETAILER WHERE id=' + retaileridtosend;
                            tx2.executeSql(rsqls, [], function (tx2, results2) {
                                retailertosend = results2.rows.item(0);
                                retailertosend.remark = remarktosend;
                                //get number to send sms
                                number1 = retailertosend.contactnumber;
                                number2 = retailertosend.ownernumber;
                                //sending order
                                MyServices.sendSyncOrderNow(carttosend, retailertosend).success(syncordersuccess);
                                //send sms
                                if (carttosend.length > 0) {
                                    MyServices.sms(number1, number2, totalq, totalp).success(smssuccess);
                                };
                            }, function (tx2, results2) {});
                        };
                    }, function (tx2, results2) {});
                });
            },
            addnewretailer: function (data) {
                console.log(data.area);
                db.transaction(function (tx) {
                    db.transaction(function (tx) {
                        var sqls = 'INSERT INTO RETAILER (id,lat,long,area,dob,type_of_area,sq_feet,store_image,name,number,email,address,ownername,ownernumber,contactname,contactnumber,timestamp, sync) VALUES (0,"' + data.lat + '","' + data.long + '","' + data.area + '","' + data.dob + '","' + data.type_of_area + '","' + data.sq_feet + '","' + data.store_image + '","' + data.name + '","' + data.number + '","' + data.email + '","' + data.address + '","' + data.ownername + '","' + data.ownernumber + '","' + data.contactname + '","' + data.contactnumber + '",null, "false")';
                        console.log(sqls);
                        tx.executeSql(sqls, [], function (tx, results) {
                            console.log("RAOW INSERTED");
                        }, function (tx, results) {
                            console.log("RAOW NOT INSERTED");
                        });
                    });
                });
            },
            editaretailer: function (data, name) {
                db.transaction(function (tx) {
                    var sqls = 'UPDATE RETAILER SET email = "' + data.email + '", ownername = "' + data.ownername + '", ownernumber = "' + data.ownernumber + '", contactname = "' + data.contactname + '", contactnumber = "' + data.contactnumber + '", sync = "false" WHERE id = ' + data.id + ' AND name ="' + name + '"';
                    console.log(sqls);
                    tx.executeSql(sqls, [], function (tx, results) {
                        console.log("RAOW UPDATED");
                    }, function (tx, results) {
                        console.log("RAOW NOT INSERTED");
                    });
                });
            },
            getalldata: function (s, c, a, r) {
                console.log(r);
                db.transaction(function (tx) {
                    var sqls = 'SELECT * FROM STATE';
                    console.log(sqls);
                    tx.executeSql(sqls, [], function (tx, results) {
                        for (var i = 0; i < results.rows.length; i++) {
                            checkstatedata.push(results.rows.item(i));
                        };
                        var sqls = 'SELECT * FROM CITY';
                        console.log(sqls);
                        tx.executeSql(sqls, [], function (tx, results) {
                            for (var i = 0; i < results.rows.length; i++) {
                                checkcitydata.push(results.rows.item(i));
                            };
                            //console.log(checkcitydata);
                            var sqls = 'SELECT * FROM AREA';
                            console.log(sqls);
                            tx.executeSql(sqls, [], function (tx, results) {
                                for (var i = 0; i < results.rows.length; i++) {
                                    checkareadata.push(results.rows.item(i));
                                };
                                console.log(checkareadata);
                                console.log(a);
                                var sqls = 'SELECT * FROM RETAILER';
                                console.log(sqls);
                                tx.executeSql(sqls, [], function (tx, results) {
                                    for (var i = 0; i < results.rows.length; i++) {
                                        checkretailerdata.push(results.rows.item(i));
                                    };
                                    //console.log(checkretailerdata);

                                    // FINAL SUCCESS //

                                    if (s.length == checkstatedata.length) {
                                        console.log("state is same");
                                    } else {
                                        console.log("Its not same");
                                        //SYNC STATE
                                        this.insertretailerstatedata(s);
                                    };
                                    if (c.length == checkcitydata.length) {
                                        console.log("city is same");
                                    } else {
                                        console.log("city not same");
                                        //SYNC CITY
                                        this.updatecitydata(c);
                                    };
                                    if (a.length == checkareadata.length) {
                                        console.log("area is same");
                                    } else {
                                        console.log("area not same");
                                        //SYNC AREA
                                        this.insertretailerareadata(a);
                                    };
                                    if (r.length == checkretailerdata.length) {
                                        console.log("retaler is same");
                                    } else {
                                        console.log("retailer not same");
                                        //SYNC RETIALER
                                        this.insertretailerdata(r);
                                    };

                                }, function (tx, results) {
                                    console.log("RAOW NOT INSERTED");
                                });
                            }, function (tx, results) {
                                console.log("RAOW NOT INSERTED");
                            });
                        }, function (tx, results) {
                            console.log("RAOW NOT INSERTED");
                        });
                    }, function (tx, results) {
                        console.log("RAOW NOT INSERTED");
                    });
                });
            },
            test1: function () {
                console.log("test is working");
            },
            test2: function () {
                this.test1();
            },
            sendretailerupdate: function (sqls) {
                var editretailersuccess = function (data, status) {

                    console.log(data);
                    /*db.transaction(function (tx) {
                    var sqls2 = 'UPDATE RETAILER SET sync = true WHERE id = '+data.id;
                    tx.executeSql(sqls, [], function (tx, results) {
                        console.log("UPDATED");
                    }, function (tx, results) {

                    });
                    //$cordovaToast.show('Top Ten Data Imported', 'long', 'bottom');
                });*/
                };
                db.transaction(function (tx) {
                    console.log(sqls);
                    MyServices.print();
                    tx.executeSql(sqls, [], function (tx, results) {
                        for (var i = 0; i < results.rows.length; i++) {
                            console.log(results.rows.item(i));
                            MyServices.editretailerdetails(results.rows.item(i)).success(editretailersuccess);
                        };
                    }, function (tx, results) {

                    });
                    //$cordovaToast.show('Top Ten Data Imported', 'long', 'bottom');
                });
            },
            sendnewretailer: function (sqls) {
                var addRetailerSuccess = function (data, status) {
                    console.log(data);
                    /*db.transaction(function (tx) {
                    var sqls2 = 'UPDATE RETAILER SET sync = true, id = '+data.id+' WHERE name = '+data.name+'AND area = '+data.area ;
                    tx.executeSql(sqls, [], function (tx, results) {
                        console.log("UPDATED");
                    }, function (tx, results) {

                    });
                    //$cordovaToast.show('Top Ten Data Imported', 'long', 'bottom');
                });*/
                };
                db.transaction(function (tx) {
                    console.log(sqls);
                    tx.executeSql(sqls, [], function (tx, results) {
                        console.log(results.rows.length);
                        for (var i = 0; i < results.rows.length; i++) {
                            console.log(results.rows.item(i));
                            MyServices.addNewRetailer(results.rows.item(i)).success(addRetailerSuccess);
                        };
                    }, function (tx, results) {

                    });
                    //$cordovaToast.show('Top Ten Data Imported', 'long', 'bottom');
                });
            },

        }
    });