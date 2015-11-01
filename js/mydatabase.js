//VARIABLES NEEDED
//var adminurl = "http://localhost/NetworkBackend/rest/index.php/";
var adminurl = "http://toy-kraft.com/NetworkBackend/rest/index.php/";
//var adminurl = "http://169.254.216.140/NetworkBackend/rest/index.php/";
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
/*db.transaction(function (tx) {
    tx.executeSql('INSERT INTO `USERS` VALUES(1,"abc","toykraft","toykraft","","","","3","")');
    //tx.executeSql('DELETE FROM `USERS`');
})*/
var mydatabase = angular.module('mydatabase', [])
    .factory('MyDatabase', function ($http, $location, MyServices, $cordovaNetwork, $cordovaToast, $interval) {


        var orderproductcount = 0;
        var ordersynccount = 0;

        return {
            //ORDER SYNC
            getordersynccount: function () {
                return ordersynccount;
            },
            setordersynccount: function () {
                var user = MyServices.getuser();
                //console.log('SELECT COUNT(*) as `number` FROM ORDERS WHERE `issync` = 0 AND `salesid`='+user.id);
                if (user) {
                    db.transaction(function (tx) {
                        tx.executeSql('SELECT COUNT(*) as `number` FROM ORDERS WHERE `issync` = 0 AND `salesid`=' + user.id, [], function (tx, results) {
                            console.log(results.rows.item(0).number)
                            ordersynccount = results.rows.item(0).number;
                        }, function (tx, results) {
                            console.log(results);
                        })
                    });
                };
            },
            syncorders: function (scope, oid2) {
                user = MyServices.getuser();
                var sendmsg = function (orderdata, number1, number2) {
                    console.log(orderdata.quantity);
                    if (orderdata.quantity > 0) {
                        MyServices.sms(number1, number2, orderdata.quantity, orderdata.amount).success(function (data, status) {
                            console.log(data);

                        });
                    };
                };
                //SYNC SUCCESS
                var syncordersuccess = function (odata, ordersid, retailerdata) {
                    console.log(retailerdata);
                    db.transaction(function (tx) {
                        console.log("sync value change");

                        tx.executeSql('UPDATE `ORDERS` SET `id`=' + odata.id + ',`issync`= 1 WHERE `id`=' + ordersid + ' AND `salesid`=' + user.id, [], function (tx, results) {
                            tx.executeSql('UPDATE `ORDERPRODUCT` SET `orders`=' + odata.id + ' WHERE `orders`=' + ordersid, [], function (tx, results) {

                                scope.ordersup--;
                                if (scope.ordersup == 0) {
                                    scope.downloadordersfunction();
                                };
                                MyServices.sendorderemail(odata.id, odata.retail, odata.amount, odata.sales, odata.timestamp, odata.quantity, odata.remark).success(function (data, status) {
                                    console.log(data);
                                    sendmsg(odata, retailerdata.ownernumber, retailerdata.contactnumber);
                                });
                                scope.$apply();
                            }, function (tx, results) {
                                console.log("error");
                            });
                        }, function (tx, results) {
                            console.log("error");
                        });

                    });
                };

                //SYNC TO ONLINE
                var syncordernow = function (cart, retaildata) {
                    console.log("going orders to ol");
                    return $http.post(adminurl + "orders/makeorder", {
                        cart: cart,
                        user: user,
                        retailer: retaildata,
                    });
                };

                //RETAINING CART//THIS PART IS CREATING CART
                var getcart = function (oid, rd) {
                    console.log("retaining cart");
                    db.transaction(function (tx) {
                        tx.executeSql('SELECT * FROM `ORDERPRODUCT` WHERE `orders` = ' + oid, [], function (tx, results) {
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
                                console.log(data);
                                syncordersuccess(data, oid, rd)
                            });
                        }, function (tx, results) {});
                    });
                };

                //RETAINING RETAILER
                var getretailer = function (orderid, retailerid, remark) {
                    db.transaction(function (tx) {
                        tx.executeSql('SELECT * FROM `RETAILER` WHERE `id` = ' + retailerid, [], function (tx, results) {
                            console.log("Retailer Retained");
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
                    tx.executeSql('SELECT * FROM `orders` WHERE `issync` = 0 AND `salesid`=' + user.id, [], function (tx, results) {
                        console.log("Orders Retained");
                        for (var os = 0; os < results.rows.length; os++) {
                            getretailer(results.rows.item(os).id, results.rows.item(os).retail, results.rows.item(os).remark);
                        };
                    }, function (tx, results) {
                        console.log("error");
                    });
                });
            },

            //DOWNLOAD INDIVIDUAL RETAILER
            downloadretailer: function (data, scope) {

                db.transaction(function (tx) {
                    var sqls = "INSERT INTO RETAILER (id,lat,long,area,dob,type_of_area,sq_feet,store_image,name,number,email,address,ownername,ownernumber,contactname,contactnumber,timestamp, issync) VALUES (" + data.id + ",'" + data.lat + "','" + data.long + "','" + data.area + "','" + data.dob + "','" + data.type_of_area + "','" + data.sq_feet + "','" + data.store_image + "','" + data.name + "','" + data.number + "','" + data.email + "','" + data.address + "','" + data.ownername + "','" + data.ownernumber + "','" + data.contactname + "','" + data.contactnumber + "','" + data.timestamp + "',1)";
                    console.log(sqls);
                    tx.executeSql(sqls, [], function (tx, results) {
                        console.log("Retailer Added");
                        scope.retailersdown--;
                        scope.$apply();
                    }, function (tx, results) {
                        console.log(results);
                    });
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


                });
                db.transaction(function (tx) {
                    tx.executeSql('CREATE TABLE IF NOT EXISTS CITY (id Integer PRIMARY KEY, state Integer, name Varchar)');


                });
                db.transaction(function (tx) {
                    tx.executeSql('CREATE TABLE IF NOT EXISTS AREA (id Integer PRIMARY KEY, city Integer, name Varchar, distributor Integer)');


                });
                db.transaction(function (tx) {
                    tx.executeSql('CREATE TABLE IF NOT EXISTS RETAILER (id INTEGER PRIMARY KEY AUTOINCREMENT,lat integer,long integer,area integer,dob date ,type_of_area varchar,sq_feet float,store_image Varchar,name Varchar,number Varchar,email Varchar,address Varchar,ownername Varchar,ownernumber Varchar,contactname Varchar,contactnumber Varchar,timestamp TIMESTAMP, issync Integer)');
                    //  tx.executeSql('drop table retailer');
                });
                db.transaction(function (tx) {
                    tx.executeSql('CREATE TABLE IF NOT EXISTS PRODUCT (id INTEGER PRIMARY KEY AUTOINCREMENT, name Varchar, product Varchar, encode Varchar, name2 Varchar, productcode Varchar, category Integer,video Varchar,mrp,description VARCHAR2(5000),age Integer,scheme Varchar,isnew Integer,timestamp Timestamp)');


                });
                db.transaction(function (tx) {
                    tx.executeSql('CREATE TABLE IF NOT EXISTS ORDERS (id INTEGER PRIMARY KEY, retail Integer,sales Varchar,timestamp,amount double,signature integer,salesid Integer,quantity Integer,remark text,issync integer)')

                });
                db.transaction(function (tx) {
                    tx.executeSql('CREATE TABLE IF NOT EXISTS TOPTEN (product INTEGER, productcode, name, totalquantity)');

                });
                db.transaction(function (tx) {
                    tx.executeSql('CREATE TABLE IF NOT EXISTS ORDERPRODUCT (id Integer PRIMARY KEY, orders Integer, product Integer, quantity Integer,name varchar, amount double, scheme_id Integer, status Integer, category varchar, productcode varchar)');

                });
                db.transaction(function (tx) {
                    tx.executeSql('CREATE TABLE IF NOT EXISTS PRODUCTIMAGE (id Integer PRIMARY KEY, product Integer, image varchar)');

                });

                var drops = function () {
                    db.transaction(function (tx) {
                        tx.executeSql('DROP TABLE STATE');
                        tx.executeSql('DROP TABLE CITY');
                        tx.executeSql('DROP TABLE AREA');
                        tx.executeSql('DROP TABLE RETAILER');
                        tx.executeSql('DROP TABLE PRODUCT');
                        tx.executeSql('DROP TABLE ORDERS');
                        tx.executeSql('DROP TABLE TOPTEN');
                        tx.executeSql('DROP TABLE ORDERPRODUCT ');
                        tx.executeSql('DROP TABLE PRODUCTIMAGE');
                    });
                };

                //$interval(drops, 5000);

            },

            //STATE SYNC
            syncinretailerstatedata: function () {
                return $http.get(adminurl + "state/find", {
                    params: {}
                })
            },
            insertretailerstatedata: function (data, scope) {
                db.transaction(function (tx) {
                    for (var i = 0; i < data.length; i++) {
                        var sqls = 'INSERT INTO STATE (id , zone, name) VALUES (' + data[i].id + ',"' + data[i].zone + '","' + data[i].name + '")';
                        tx.executeSql(sqls, [], function (tx, results) {}, null);
                    };


                    scope.importtable("States");
                });
            },

            //CITY SYNC
            syncinretailercitydata: function () {
                return $http.get(adminurl + "city/find", {
                    params: {}
                })
            },
            insertretailercitydata: function (data, scope) {
                db.transaction(function (tx) {
                    for (var i = 0; i < data.length; i++) {
                        var sqls = 'INSERT INTO CITY (id , state, name) VALUES (' + data[i].id + ',"' + data[i].state + '","' + data[i].name + '")';
                        tx.executeSql(sqls, [], function (tx, results) {}, null);
                    };

                    scope.importtable("City");
                });
            },

            //AREA SYNC
            syncinretailerareadata: function () {
                return $http.get(adminurl + "area/find", {
                    params: {}
                })
            },
            insertretailerareadata: function (data, scope) {
                db.transaction(function (tx) {
                    for (var i = 0; i < data.length; i++) {
                        var sqls = 'INSERT INTO AREA (id , city, name,distributor) VALUES (' + data[i].id + ',' + data[i].city + ',"' + data[i].name + '",' + data[i].distributor + ')';
                        tx.executeSql(sqls, [], function (tx, results) {}, null);
                    };
                    scope.importtable("Area");
                });
            },

            //PRODUCTIMAGE SYNC
            syncinproductimagedata: function () {
                return $http.get(adminurl + "productimage/find", {
                    params: {}
                })
            },
            insertproductimagedata: function (data, scope) {
                db.transaction(function (tx) {
                    for (var i = 0; i < data.length; i++) {
                        var sqls = 'INSERT INTO PRODUCTIMAGE (id , product, image) VALUES (' + data[i].id + ',"' + data[i].product + '","' + data[i].image + '")';

                        tx.executeSql(sqls, [], function (tx, results) {}, null);
                    };
                    scope.importtable("Product Images");
                });
            },

            //RETAILER SYNC
            syncinretailerdata: function () {
                return $http.get(adminurl + "retailer/find", {
                    params: {}
                })
            },
            insertretailerdata: function (data, scope) {
                db.transaction(function (tx) {
                    for (var i = 0; i < data.length; i++) {
                        var sqls = 'INSERT INTO RETAILER (id,lat,long,area,dob,type_of_area,sq_feet,store_image,name,number,email,address,ownername,ownernumber,contactname,contactnumber,timestamp, issync) VALUES (' + data[i].id + ',"' + data[i].lat + '","' + data[i].long + '","' + data[i].area + '","' + data[i].dob + '","' + data[i].type_of_area + '","' + data[i].sq_feet + '","' + data[i].store_image + '","' + data[i].name + '","' + data[i].number + '","' + data[i].email + '","' + data[i].address + '","' + data[i].ownername + '","' + data[i].ownernumber + '","' + data[i].contactname + '","' + data[i].contactnumber + '","' + data[i].timestamp + '",1)';
                        tx.executeSql(sqls, [], function (tx, results) {
                            console.log("RAOW INSERTED");
                        }, function (tx, results) {
                            console.log("Not inserted");
                        });
                    };
                    scope.importtable("Retailer");
                });
            },

            //PRODUCT SYNC
            syncinproductdata: function () {
                return $http.get("http://toy-kraft.com/NetworkBackend/rest/index.php/product/find", {
                    params: {}
                })
            },
            insertproductdata: function (data, scope, scheme) {
                db.transaction(function (tx) {
                    for (var i = 0; i < data.length; i++) {
                        var sqls = 'INSERT INTO PRODUCT (id, name, product, encode, name2, productcode, category,video,mrp,description,age,scheme,isnew,timestamp) VALUES (' + data[i].id + ',"' + data[i].name + '","' + data[i].product + '","' + data[i].encode + '","' + data[i].name2 + '","' + data[i].productcode + '","' + data[i].category + '","' + data[i].video + '","' + data[i].mrp + '","' + data[i].description + '","' + data[i].age + '","' + data[i].scheme + '","' + data[i].isnew + '","' + data[i].timestamp + '")';

                        tx.executeSql(sqls, [], function (tx, results) {
                            console.log("PRODUCT RAOW INSERTED");
                        }, function (tx, results) {
                            console.log("PRODUCT RAOW NOT INSERTED");
                        });
                    };
                    scope.importtable("Product");
                    if (scheme == 1) {
                        scope.getscheme();
                    };
                });
            },

            //TOP TEN
            inserttopten: function (scope, data) {
                db.transaction(function (tx) {
                    for (var i = 0; i < data.length; i++) {
                        var sqls = 'INSERT INTO TOPTEN (product, productcode, name, totalquantity) VALUES (' + data[i].product + ',"' + data[i].productcode + '","' + data[i].name + '","' + data[i].totalquantity + '")';
                        tx.executeSql(sqls, [], function (tx, results) {
                            console.log("TOP TEN RAOW INSERTED");
                        }, function (tx, results) {
                            console.log("TOP TEN NOT INSERTED");
                        });
                    };
                    scope.tt = false;
                    scope.$apply();
                    //$cordovaToast.show('Top Ten Data Imported', 'long', 'bottom');
                });
            },

            //SYNC CATEGORIES
            getcategoriesname: function () {
                return $http.get(adminurl + "catelog/getcatelog");
            },
            synccategorydata: function (data) {

            },

            /*//DOWNLOAD ORDERS FULL
            insertintoorders: function (data, scope) {
                console.log(data);
                console.log(data[0].orders[0].orderproducts);

                var insertproductsdb = function (productdata, pn, on) {
                    db.transaction(function (tx) {
                        tx.executeSql("INSERT INTO `orderproduct` (orders, product, quantity, name, amount, scheme_id, status, category, productcode) VALUES (" + productdata.order + ", '" + productdata.product + "', '" + productdata.quantity + "', '" + productdata.name + "', '" + productdata.amount + "', '" + productdata.scheme_id + "', '" + productdata.status + "', '" + productdata.category + "', '" + productdata.productcode + "')", [], function (tx, results) {
                            $cordovaToast.show("Order Number:"+on+"Product Number:" + pn, 'long', 'bottom');
                            console.log("Order Number:"+on+"Product Number:" + pn);
                        }, function (tx, results) {
                            console.log("TOP TEN NOT INSERTED");
                        });
                    });
                };

                var insertproducts = function (odata, on) {
                    for (var k = 0; k < odata.length; k++) {
                        insertproductsdb(odata[k], k+1, on);
                    };
                    scope.ordersdown--;
                    scope.$apply();
                };

                var escapefuntion = function (e, r) {

                    console.log("put order number " + data[e].orders[r] + "" + e);
                    if (data[e].orders[r].quantity > 0) {
                        console.log(data[e].orders[r].orderproducts);
                        insertproducts(data[e].orders[r].orderproducts, r);
                    } else {
                        scope.ordersdown--;
                        scope.$apply();
                    };
                };

                var databasefunction = function (iop, jk) {
                    db.transaction(function (tx) {
                        tx.executeSql("INSERT INTO `orders` (`id`, `retail`, `sales`, `timestamp`, `amount`, `signature`, `salesid`, `quantity`, `remark`, `issync`) VALUES (" + data[iop].orders[jk].id + ", '" + data[iop].orders[jk].retail + "', '" + data[iop].orders[jk].sales + "', '" + data[iop].orders[jk].timestamp + "', '" + data[iop].orders[jk].amount + "', '" + data[iop].orders[jk].signature + "', " + data[iop].orders[jk].salesid + ", " + data[iop].orders[jk].quantity + ", '" + data[iop].orders[jk].remark + "', 1) ", [],
                            function (tx, results) {
                                escapefuntion(iop, jk);

                            },
                            function (tx, results) {
                                console.log("TOP TEN NOT INSERTED");
                            })
                    });
                };


                console.log("insert data");
                for (var io = 0; io < data.length; io++) {
                    console.log("first for loop");
                    if (data[io].orders.length > 0) {
                        for (var j = 0; j < data[io].orders.length; j++) {
                            console.log("second for loop");
                            $cordovaToast.show("Retained Order Number : "+j+" of "+io+" user", 'long', 'bottom');
                            console.log(j + " " + io);
                            console.log(data[io].orders[j].quantity);
                            databasefunction(io, j);

                        };
                    };
                };

            },*/


            insertintoorders: function (data, scope) {
                console.log(data);
                console.log(data[0].orders[0].orderproducts);

                var insertproductsdb = function (productdata, on) {
                    db.transaction(function (tx) {
                        tx.executeSql("INSERT INTO `orderproduct` (orders, product, quantity, name, amount, scheme_id, status, category, productcode) VALUES " + productdata, [], function (tx, results) {
                            $cordovaToast.show("Order Number:" + on + " -Products", 'short', 'bottom');
                            console.log("Order Number: " + on + " Products");
                        }, function (tx, results) {
                            console.log("PRODUCT INSERT ERROR");
                        });
                    });
                };

                var insertindividualproduct = function (product, on) {
                    db.transaction(function (tx) {
                        tx.executeSql("INSERT INTO `orderproduct` (orders, product, quantity, name, amount, scheme_id, status, category, productcode) VALUES (?,?,?,?,?,?,?,?,?)", [product.order, product.product, product.quantity, product.name, product.amount, product.scheme_id, product.status, product.category, product.productcode], function (tx, results) {
                            $cordovaToast.show("Order Number:" + on + " -Products", 'short', 'bottom');
                            console.log("Order Number: " + on + " Products");
                        }, function (tx, results) {
                            console.log("PRODUCT INSERT ERROR");
                            console.log(results);
                        });
                    });
                };

                var insertproducts = function (odata, on) {
                    var values = "";
                    for (var k = 0; k < odata.length; k++) {
                        insertindividualproduct(odata[k], on);
                        //insertproductsdb(odata[k], k+1, on);
                        /*values += "(" + odata[k].order + ", '" + odata[k].product + "', '" + odata[k].quantity + "', '" + odata[k].name + "', '" + odata[k].amount + "', '" + odata[k].scheme_id + "', '" + odata[k].status + "', '" + odata[k].category + "', '" + odata[k].productcode + "')";*/
                        /*if (k != odata.length - 1) {
                            values += ",";
                        };*/
                    };
                    //insertproductsdb(values, on);
                    scope.ordersdown--;
                    scope.$apply();
                };

                var escapefuntion = function (e, r) {

                    console.log("put order number " + data[e].orders[r] + "" + e);
                    if (data[e].orders[r].quantity > 0) {
                        insertproducts(data[e].orders[r].orderproducts, r);
                    } else {
                        scope.ordersdown--;
                        scope.$apply();
                    };
                };

                var databasefunction = function (iop, jk) {
                    db.transaction(function (tx) {
                        tx.executeSql("INSERT INTO `orders` (`id`, `retail`, `sales`, `timestamp`, `amount`, `signature`, `salesid`, `quantity`, `remark`, `issync`) VALUES (?,?,?,?,?,?,?,?,?,?)", [data[iop].orders[jk].id, data[iop].orders[jk].retail, data[iop].orders[jk].sales, data[iop].orders[jk].timestamp, data[iop].orders[jk].amount, data[iop].orders[jk].signature, data[iop].orders[jk].salesid, data[iop].orders[jk].quantity, data[iop].orders[jk].remark, 1],
                            function (tx, results) {
                                escapefuntion(iop, jk);

                            },
                            function (tx, results) {
                                console.log(data[iop].orders[kj].id + "did NOT GET INSERTED");
                                scope.ordersdown--;
                            })
                    });
                };


                console.log("insert data");
                for (var io = 0; io < data.length; io++) {
                    console.log("user number " + io);
                    if (data[io].orders.length > 0) {
                        for (var j = 0; j < data[io].orders.length; j++) {
                            console.log("user number " + io + " order no. " + j);
                            $cordovaToast.show("Retained Order Number : " + j + " of " + io + " user", 'long', 'bottom');
                            console.log(data[io].orders[j].quantity);
                            databasefunction(io, j);

                        };
                    };
                };

            },

            updateschemeproducts: function (data, scope) {
                var updatescheme = function () {
                    console.log(data);
                    db.transaction(function (tx) {
                        for (var s = 0; s < data.length; s++) {
                            tx.executeSql("UPDATE `PRODUCT` SET `scheme`= " + data[s].scheme + " WHERE `id` = " + data[s].id, [], function (tx, results) {
                                //$cordovaToast.show("Scheme Products Updated", 'short', 'bottom');

                            }, function (tx, results) {
                                console.log("SCHEME NOT UPDATED");
                            });
                        };
                        $cordovaToast.show("Scheme Products Updated", 'short', 'bottom');
                        scope.hideloading();
                    });
                };
                db.transaction(function (tx) {
                    tx.executeSql("UPDATE `PRODUCT` SET `scheme`= 0 WHERE `scheme` > 0", [], function (tx, results) {
                        updatescheme();
                    }, function (tx, results) {
                        console.log("SCHEME NOT UPDATED");
                    });
                });
            },

            insertintoorderswhilesync: function (data, scope) {

                var insertproductsdb = function (productdata) {
                    db.transaction(function (tx) {
                        tx.executeSql("INSERT INTO `orderproduct` (orders, product, quantity, name, amount, scheme_id, status, category, productcode) VALUES " + productdata, [], function (tx, results) {
                            //$cordovaToast.show("Order Products downloading", 'long', 'bottom');
                            console.log("Order Number:  Products");
                        }, function (tx, results) {
                            console.log("TOP TEN NOT INSERTED");
                        });
                    });
                };

                var insertproducts = function (productdata) {
                    var values = "";
                    for (var pd = 0; pd < productdata.length; pd++) {
                        values += "(" + productdata[pd].order + ", '" + productdata[pd].product + "', '" + productdata[pd].quantity + "', '" + productdata[pd].name + "', '" + productdata[pd].amount + "', '" + productdata[pd].scheme_id + "', '" + productdata[pd].status + "', '" + productdata[pd].category + "', '" + productdata[pd].productcode + "')";
                        if (pd != productdata.length - 1) {
                            values += ",";
                        };
                    };
                    scope.ordersdown--;
                    insertproductsdb(values);

                };

                var insertorder = function (orderdata) {
                    db.transaction(function (tx) {
                        tx.executeSql("INSERT INTO `orders` (`id`, `retail`, `sales`, `timestamp`, `amount`, `signature`, `salesid`, `quantity`, `remark`, `issync`) VALUES (" + orderdata.id + ", '" + orderdata.retail + "', '" + orderdata.sales + "', '" + orderdata.timestamp + "', '" + orderdata.amount + "', '" + orderdata.signature + "', " + orderdata.salesid + ", " + orderdata.quantity + ", '" + orderdata.remark + "', 1) ", [],
                            function (tx, results) {
                                //$cordovaToast.show("Orders downloading", 'long', 'bottom');
                                if (orderdata.quantity > 0) {
                                    insertproducts(orderdata.orderproducts);
                                } else {
                                    scope.ordersdown--;
                                };

                            },
                            function (tx, results) {
                                scope.ordersdown--;
                                console.log("TOP TEN NOT INSERTED");
                            })
                    });
                };

                for (var insy = 0; insy < data.length; insy++) {
                    insertorder(data[insy]);

                };
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
                    //var timeStamp=;
                    if (retailerdata.remark == undefined) {
                        retailerdata.remark = "No Remark";
                    };
                    var sqls = 'INSERT INTO ORDERS (retail ,sales, amount, signature, salesid, timestamp, quantity, remark, issync) VALUES (' + retailerdata.id + ', "' + user.name + '",' + totalamount + ' , 1 , ' + user.id + ',strftime("%Y-%m-%d %H:%M:%S", "now", "localtime") ,' + totalquantity + ' , "' + retailerdata.remark + '", 0 )';
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
                db.transaction(function (tx) {
                    db.transaction(function (tx) {
                        var sqls = "INSERT INTO RETAILER (lat,long,area,dob,type_of_area,sq_feet,store_image,name,number,email,address,ownername,ownernumber,contactname,contactnumber,timestamp, issync) VALUES ('" + data.lat + "','" + data.long + "','" + data.area + "','" + data.dob + "','" + data.type_of_area + "','" + data.sq_feet + "','" + data.store_image + "','" + data.name + "','" + data.number + "','" + data.email + "','" + data.address + "','" + data.ownername + "','" + data.ownernumber + "','" + data.contactname + "','" + data.contactnumber + "',strftime('%Y-%m-%d %H:%M:%S', 'now', 'localtime'),0)";
                        tx.executeSql(sqls, [], function (tx, results) {
                            console.log("RAOW INSERTED");
                            window.location.replace(window.location.origin + window.location.pathname + "#/app/retailer/" + data.area);
                        }, function (tx, results) {
                            console.log(results);
                        });
                    });
                });
            },

            editaretailer: function (data, name, scope) {
                db.transaction(function (tx) {
                    var sqls = 'UPDATE RETAILER SET email = "' + data.email + '", ownername = "' + data.ownername + '", ownernumber = "' + data.ownernumber + '", contactname = "' + data.contactname + '", contactnumber = "' + data.contactnumber + '", issync = 0 WHERE id = ' + data.id + ' AND name ="' + name + '"';
                    tx.executeSql(sqls, [], function (tx, results) {
                        console.log("RAOW UPDATED");

                        scope.oModal2.hide();

                    }, function (tx, results) {
                        console.log("RAOW NOT INSERTED");
                    });
                });
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

            //SYNC BUTTON - FIRST UPLOAD RETAILER IF THERE
            sendnewretailer: function (sqls, scope) {
                var addRetailerSuccess = function (data) {
                    db.transaction(function (tx) {
                        tx.executeSql('UPDATE `RETAILER` SET `issync`=1,`id`=' + data[1] + '  WHERE `id` =' + data[0], [], function (tx, results) {
                            tx.executeSql('UPDATE `ORDERS` SET `retail`=' + data[1] + '  WHERE `retail` =' + data[0], [], function (tx, results) {
                                scope.retailersup--;
                                //  console.log(scope.retailersdown);
                                if (scope.retailersup == 0) {
                                    scope.syncordersfunction();
                                };
                                scope.$apply();
                            }, null);
                        }, function (tx, results) {});
                    });
                };

                //SELECT * FROM RETAILER WHERE issync = 0
                db.transaction(function (tx) {
                    tx.executeSql(sqls, [], function (tx, results) {

                        for (var i = 0; i < results.rows.length; i++) {
                            newretailerdata = results.rows.item(i);
                            console.log(results.rows.item(i).issync);
                            MyServices.addNewRetailer(results.rows.item(i)).success(function (data, status) {
                                console.log(data);
                                addRetailerSuccess(data);
                            });
                        };
                    }, function (tx, results) {});
                });
            },

            getcountofretailers: function () {
                return $http.get(adminurl + "retailer/count", {
                    params: {}
                });
            },
            examine: function (scope) {
                db.transaction(function (tx) {
                    tx.executeSql('SELECT * FROM ZONE', [], function (tx, results) {
                        console.log(scope.button);
                        scope.button = true;
                        console.log(scope.button);
                        scope.$apply();
                    }, null);
                });
            },
            getdatedata: function (date, user, scope) {
                scope.ordersdata = [];
                console.log(date);
                console.log(user);
                var sqls = 'SELECT * FROM `ORDERS` WHERE date(`timestamp`)= "' + date + '"';
                console.log(sqls);
                db.transaction(function (tx) {
                    tx.executeSql(sqls, [], function (tx, results) {
                        console.log("success");
                        for (var i = 0; i < results.rows.length; i++) {
                            scope.ordersdata[i] = results.rows.item(i);
                        };
                        console.log(results.rows.length);
                    }, null);
                });
            },

            getdatabyretailer: function (retailer, scope) {
                var ordersdatabyretailerid = [];
                db.transaction(function (tx) {
                    tx.executeSql('SELECT * FROM `ORDERS` WHERE `retail`=' + retailer, [], function (tx, results) {
                        console.log("success");
                        for (var i = 0; i < results.rows.length; i++) {
                            ordersdatabyretailerid[i] = results.rows.item(i);
                        };
                        scope.retailerdatasuccess(ordersdatabyretailerid);
                        scope.$apply();
                        console.log(results.rows.length);
                    }, null);

                });
            },
            getorderproductdetails: function (retailerdetails, orderdetailsdata, scope) {
                db.transaction(function (tx) {
                    tx.executeSql('SELECT * FROM `ORDERPRODUCT` WHERE `orders`=' + orderdetailsdata.id, [], function (tx, results) {
                        var details = [{}];
                        var orderproduct = []
                        console.log(results.rows.length);
                        for (var i = 0; i < results.rows.length; i++) {
                            orderproduct[i] = results.rows.item(i);
                        };
                        console.log(results.rows.length);
                        var details = [{}];
                        details[0].retailerdata = retailerdetails;
                        details[0].orderdata = orderdetailsdata;
                        details[0].orderproductdata = orderproduct;
                        console.log(details);
                        scope.orderdetails(details);
                        scope.$apply();
                    }, null);
                });
            },
            getretailerdetail: function (orderdetails, MyDatabase, scope) {
                db.transaction(function (tx) {
                    tx.executeSql('SELECT * FROM `RETAILER` WHERE id=' + orderdetails.retail, [], function (tx, results) {
                        console.log(results.rows.length);
                        MyDatabase.getorderproductdetails(results.rows.item(0), orderdetails, scope);
                    }, null);
                });
            },
            getorderdetail: function (id, MyDatabase, scope) {
                db.transaction(function (tx) {
                    var orderdetails = [];
                    tx.executeSql('SELECT * FROM `ORDERS` WHERE id=' + id, [], function (tx, results) {
                        console.log(results.rows);
                        MyDatabase.getretailerdetail(results.rows.item(0), MyDatabase, scope);
                    }, function (tx, results) {
                        console.log("error");
                    });
                });
            },
            //States Data
            findstates: function (zid, scope) {
                db.transaction(function (tx) {
                    tx.executeSql('SELECT * FROM `STATE` WHERE `zone`=' + zid, [], function (tx, results) {
                        console.log("hey");
                        for (var i = 0; i < results.rows.length; i++) {
                            scope.statedata[i] = results.rows.item(i);
                        };
                        scope.$apply();
                    }, function (tx, results) {
                        console.log("hey");
                    });
                });

            },
            //City Data
            findcity: function (sid, scope) {
                console.log(sid);
                db.transaction(function (tx) {
                    tx.executeSql('SELECT * FROM CITY WHERE state=' + sid, [], function (tx, results) {
                        console.log("City");
                        for (var i = 0; i < results.rows.length; i++) {
                            console.log(results.rows.item(i));
                            scope.citydata[i] = results.rows.item(i);
                        };
                        scope.$apply();
                    }, null);
                });
            },
            findarea: function (cid, scope) {
                console.log(cid);
                db.transaction(function (tx) {
                    tx.executeSql('select * from AREA where city=' + cid, [], function (tx, results) {
                        for (var i = 0; i < results.rows.length; i++) {
                            scope.areadata[i] = results.rows.item(i);
                        };
                        scope.$apply();
                    }, null);
                });
            },
            findretailer: function (aid, scope) {
                console.log(aid);
                db.transaction(function (tx) {
                    tx.executeSql('select * from RETAILER where area=' + aid, [], function (tx, results) {
                        for (var i = 0; i < results.rows.length; i++) {
                            scope.retailerdata[i] = results.rows.item(i);
                        };
                        scope.$apply();
                    }, null);
                });
            },
            retaileridforreorder: function (oid, syncart, scope, MyDatabase) {
                db.transaction(function (tx) {
                    tx.executeSql('SELECT * from ORDERS where id=' + oid, [], function (tx, results) {
                        var retailerdata = {};
                        retailerdata.id = results.rows.item(0).retail;
                        retailerdata.remark = results.rows.item(0).remark;
                        console.log(user);
                        MyDatabase.sendcartoffline(retailerdata, user, syncart)
                            /*scope.reorder(results.rows.item(0).retail,syncart,user);
                                scope.$apply();*/
                    }, null);
                });
            },
            getusersinsamezone: function (userzone) {
                console.log("user zone orders");
                return $http.get(adminurl + "user/getuserbyzone", {
                    params: {
                        zone: userzone
                    }
                });
            },
            syncordersdata: function (uid) {
                return $http.get(adminurl + "orders/getordersbyuser", {
                    params: {
                        user: uid
                    }
                });
            },
            inserorderproductdata: function (data, scope) {

                console.log("SUCCESS");

                var productcount = data.length;
                var check = 0;


                //GET ORDER PRODUCTS OF THE ORDER (3)
                var insertorderproduct = function (data) {
                    db.transaction(function (tx) {
                        console.log("adding order products");
                        tx.executeSql('INSERT INTO ORDERPRODUCT (orders, product, quantity, name, amount, scheme_id, status, category, productcode) VALUES (' + data.order + ', ' + data.product + ', ' + data.quantity + ', "' + data.name + '",' + data.amount + ',' + data.scheme_id + ' ,' + data.status + ', "' + data.category + '", "' + data.productcode + '")', [], function (tx, results) {
                            check++;
                            if (check == productcount) {
                                scope.ordersdown--;
                                scope.$apply();
                                console.log("APPLY");
                            };
                        }, null);
                    });
                };

                for (var ops = 0; ops < data.length; ops++) {
                    console.log("adding order products");
                    insertorderproduct(data[ops]);
                };
            },
            insertorders: function (id, scope, mydb) {



                //FUNSTION THAT INSERTS ORDER INTO OFFLINE DB(2)
                var insertoffline = function (data, status) {
                    //INSERT RETAINED ORDER INTO OFFLINE DB
                    db.transaction(function (tx) {
                        tx.executeSql('INSERT INTO ORDERS (id, retail ,sales, amount, signature, salesid, quantity, remark, issync,timestamp) VALUES (' + data.id + ',' + data.retail + ', "' + data.sales + '",' + data.amount + ' , 1 , ' + data.salesid + ', ' + data.quantity + ' , "' + data.remark + '", 1,"' + data.timestamp + '" )', [], function (tx, results) {
                            console.log("adding order products 2");
                            scope.getorderproductsbyorder(data.id);
                        }, null);
                    });
                };

                var getorderinfo = function (id) {
                    return $http.get(adminurl + "orders/getorderbyid", {
                        params: {
                            orderid: id
                        }
                    });
                };

                getorderinfo(id).success(insertoffline);



            },
        }
    });




/*var getcart = function (oid, rd) {
                    console.log("retaining cart");
                    db.transaction(function (tx) {
                        tx.executeSql('SELECT * FROM `ORDERPRODUCT` WHERE `orders` = ' + oid, [], function (tx, results) {
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
                            
                            //GET REtAILER DATA SOTRE IN VAR
                            //GET USER
                            
                            MyDatabase.sendcartoffline()
                            
                        }, function (tx, results) {});
                    });
                };
                
                
                */