//var adminurl = "http://mafiawarloots.com/clientunderworkcode/index.php/";

var filenameee = "";
angular.module('starter.controllers', ['ngCordova', 'myservices', 'mydatabase', 'ngCordova'])

.controller('AppCtrl', function ($scope, $ionicModal, $timeout, $location, MyServices, MyDatabase, $cordovaKeyboard, $ionicLoading) {


    //CREATE ALL TABLES DURING PAGE LOAD
    MyDatabase.createretailertables();



    $scope.setslide = function () {
        var path = $location.path();
        var path2 = path.slice(0, 12)
            //console.log(path);

        if (path2 == "/app/dealer/") {
            //console.log("true");
            return true;
        } else {
            //console.log("false");
            return false;
        };
        //return false;        

        $cordovaKeyboard.hideAccessoryBar(true);

        $cordovaKeyboard.disableScroll(true);

        $cordovaKeyboard.close();

        var isVisible = $cordovaKeyboard.isVisible();
    };

    //GET CATEGORY NAMES
    $scope.categorynamedata = $.jStorage.get("categories");
    $scope.$apply();

    var synccategorydatasuccess = function (data, status) {
        $scope.categorynamedata = data;
        $.jStorage.set("categories", data);
        $scope.$apply();
    };
    //CATEGORIES
    MyDatabase.getcategoriesname().success(synccategorydatasuccess);




    $scope.rid = MyServices.getretailer();
    $scope.changecategory = function (cid) {
        MyServices.setcategory(cid);
        MyServices.setsearchtxt("");
        var retailer = MyServices.getretailer();
        $location.path("/app/dealer/" + retailer + "/" + cid);
        $location.replace();
    };

    $scope.gotosyncpage = function () {
        $location.path("/app/sync");
    };

    //XONE DATA SYNC
    var zonedata = function (data, status) {
        console.log(data);
        MyDatabase.addzonedata(data);
    };
    MyDatabase.findzonebyuser().success(zonedata);

})

.controller('menuCtrl', function ($scope, MyDatabase) {

    console.log("Menu Ctrl");


    $scope.categorynamedata = $.jStorage.get("categories");
    console.log($scope.categorynamedata);
    $scope.$apply();

    var synccategorydatasuccess = function (data, status) {
        $scope.categorynamedata = data;
        $.jStorage.set("categories", data);
        $scope.$apply();
    };
    //CATEGORIES
    MyDatabase.getcategoriesname().success(synccategorydatasuccess);


    $scope.getorsersynccount = function () {
        MyDatabase.setordersynccount();
        return MyDatabase.getordersynccount();
    };

})


.controller('syncCtrl', function ($scope, $stateParams, MyServices, MyDatabase, $location, $interval, $cordovaNetwork, $cordovaToast, $ionicPopup, $state) {
        $scope.it = true;
        $scope.tt = false;
        $scope.rt = false;
        $scope.os = false;

        $scope.user = $.jStorage.get("user");

        //POP-UP FUNCTION WHEN NO INTERNET/////////////////////////////////////////////////
        var showpopup = function (message) {
            var myPopup = $ionicPopup.show({
                template: '',
                title: message,
                subTitle: '',
                buttons: [

                    {
                        text: '<b>Refresh</b>',
                        type: 'button button-block button-assertive',
                        onTap: function (e) {
                            $state.transitionTo($state.current, $stateParams, {
                                reload: true,
                                inherit: false,
                                notify: true
                            });
                        }
      },


                    {
                        text: '<b>Home</b>',
                        type: 'button button-block button-assertive',
                        onTap: function (e) {
                            $location.path("#/app/home");
                        }
      }
    ]
            });

        };

        var type = false;
        //var type = $cordovaNetwork.isOffline();
        //alert("The type of network is" + type);
        if (type == true) {
            showpopup('No internet connection !');
        };
        ///////////////////////////////////////////////////////////////////////////////////////////////

        ///////////////////////TOP TEN SYNC//////////////////////////////////////////////////////////////////

        //CHECK IF TOP TEN IS UPDATED
        var onlinetopten = function (data, status) {
            console.log(data);
            db.transaction(function (tx) {
                tx.executeSql('SELECT * FROM `TOPTEN`', [], function (tx, results) {
                    console.log(results.rows)
                    if (results.rows.length == 0) {
                        $scope.tt = true;
                        $scope.$apply();
                    };
                    for (var ttu = 0; ttu < results.rows.length; ttu++) {
                        if (results.rows.item(ttu).product != data[ttu].product) {
                            $scope.tt = true;
                            $scope.$apply();
                        };
                    };
                }, null);
            })
        };
        var toptenupdated = function () {
            MyServices.gettoptenproducts().success(onlinetopten);
        };
        ////IF INTERNET EXISTS////
        toptenupdated();
        ////IF INTERNET EXISTS////

        var toptendatasuccess = function (data, status) {
            MyDatabase.inserttopten($scope, data);
        };
        $scope.gettoptendata = function () {
            db.transaction(function (tx) {
                var sqls = 'TRUNCATE TABLE TOPTEN';
                console.log(sqls);
                tx.executeSql(sqls, [], function (tx, results) {
                    console.log("TOP TEN RAOW DELETED");
                }, function (tx, results) {
                    console.log("TOP TEN NOT DELETED");
                });
            });
            MyServices.gettoptenproducts().success(toptendatasuccess);
        };

        //////////////////////////////////////////////////////////////////////////////////


        //THIS FUNCTION DECIDES WHICH BUTTON TO SHOW WHEN SYNC PAGE OPENED///////////////
        var hideimporttablebutton = function () {
            db.transaction(function (tx) {
                tx.executeSql('SELECT * FROM `RETAILER`', [], function (tx, results) {

                    if (results.rows.length > 0) {
                        $scope.it = false;
                        $scope.os = true;
                        $scope.preparesync();
                    };
                }, null);
            });
        };
        hideimporttablebutton();
        //////////////////////////////////////////////////////////////////////////////////







        //SYNC ORDERS//

        //GIVING VALUE TO NOTIFICATION
        MyDatabase.setordersynccount();


        $scope.downloadateretailercount = 0;
        $scope.getretailersynccount = function () {
            $scope.downloadateretailercount = MyServices.getdownloadretailercount();
            // return $scope.downloadateretailercount;
        };



        //DOWNLOAD ORDERS
        var offlineorderids = [];

        $scope.getorderproductsbyorder = function (oid) {
            console.log("calling for success");
            MyServices.getorderproducts(oid).success(function (data, status) {
                if (data.length == 0) {
                    $scope.ordersdown--;
                    $scope.$apply();
                };
                MyDatabase.inserorderproductdata(data, $scope);
            });
        };

        $scope.downloadordersfunction = function () {
            console.log("download orders");
            //GET ARRAY OF ORDERS DOWN
            var checkorders = function (data, status) {
                console.log(data);
                for (var i = 0; i < data.length; i++) {
                    if (offlineorderids.indexOf(parseInt(data[i].id)) == -1) {
                        $scope.ordersdownids.push(data[i].id);
                        MyDatabase.insertorders(data[i].id, $scope, MyServices);

                    };
                };
            };

            if ($scope.ordersdown > 0) {
                console.log("getiing orders");
                db.transaction(function (tx) {
                    tx.executeSql('SELECT `id` FROM `ORDERS` WHERE `issync`=1', [], function (tx, results) {
                        for (var i = 0; i < results.rows.length; i++) {
                            offlineorderids.push(results.rows.item(i).id);
                        };
                        console.log(offlineorderids);
                        //GET ONLINE ORDERS ID's
                        MyServices.getordersbyzone($scope.user.zone).success(checkorders);
                    }, function (tx, results) {
                        console.log("result not found");
                    });
                });

            };
        };

        //UPLOADING ORDERS
        $scope.syncordersfunction = function () {
            if ($scope.ordersup > 0) {
                //SYNC ORDERS, ON FINAL SUCCESS CALL DOWNLOAD ORDERS
                MyDatabase.syncorders($scope);
            } else {
                //CALL DOWNLOAD ORDERS
                $scope.downloadordersfunction();
            };
        };

        //DOWNLOADING RETAILERS
        var offlineretailerids = [];
        $scope.syncretailersdownfunction = function () {

            //INSERT RETAINED ONLINE RETAILER (3)
            var retailerinfofound = function (data, status) {
                console.log($scope.retailersdownids);
                MyDatabase.downloadretailer(data, $scope);
            };

            //COMPARE ONLINE-OFFLINE ORDERS (2)
            var checkretailerexist = function (data) {
                for (var i = 0; i < data.length; i++) {
                    if (offlineretailerids.indexOf(parseInt(data[i].id)) == -1) {
                        $scope.retailersdownids.push(data[i].id);
                        //CALL FUNCTION TO DOWNLOAD RETAILER
                        MyServices.findoneretailer(data[i].id).success(retailerinfofound);
                    };
                };
            };

            if ($scope.retailersdown > 0) {
                db.transaction(function (tx) {
                    tx.executeSql('SELECT `id` FROM `RETAILER` WHERE `issync`=1', [], function (tx, results) {
                        for (var i = 0; i < results.rows.length; i++) {
                            offlineretailerids.push(results.rows.item(i).id);
                        };
                        MyServices.getonlineretailerid().success(function (data, status) {
                            checkretailerexist(data);
                        });
                    }, function (tx, results) {
                        console.log("result not found");
                    });
                });

            };
        };

        $scope.syncclicked = false;

        $scope.sync = function () {
            //$cordovaToast.show('This might take several minutes, please hold on...', 'long', 'bottom');
            $scope.syncclicked = true;

            if ($scope.retailersup > 0) {
                //DO RETaileR SYNC AND ON SUCCESS CALL FUNCTION OF ORDER/RETAILER DOWNLOAD
                MyDatabase.sendnewretailer('SELECT * FROM RETAILER WHERE `issync` = 0', $scope);
            } else {
                //CALL FUNCTION OF ORDER/RETAILER DOWNLOAD
                $scope.syncordersfunction();
                $scope.syncretailersdownfunction();
            };

        };
        var apply = function () {
            $scope.$apply();
        };

        //SYNC BUTTON TRUE FUNCTION//TO BE CALLES WHEN SYNC BUTTON IS TO BE SHOWN
        $scope.preparesync = function () {
            //COUNT VARIABLES
            $scope.ordersup = 0;
            $scope.ordersdown = 0;
            $scope.retailersup = 0;
            $scope.retailersdown = 0;

            //ID's STORING VARIABLES
            $scope.retailersdownids = [];
            $scope.ordersdownids = [];

            //OFFLINE
            var offlineretailercount, offlineorderscount;

            //GET NUMBER OF ORDERS UP
            db.transaction(function (tx) {
                tx.executeSql('SELECT COUNT(*) as `count` FROM `ORDERS` WHERE `issync`=0 AND `salesid`=' + $scope.user.id, [], function (tx, results) {
                    console.log(results.rows.item(0).count)
                    if (results.rows.item(0).count > 0) {
                        $scope.ordersup = results.rows.item(0).count;
                    };
                }, null)
            });



            //GET NUMBER OF ORDERS DOWn
            db.transaction(function (tx) {
                tx.executeSql('SELECT COUNT(*) as `count` FROM `ORDERS` WHERE `issync`=1', [], function (tx, results) {
                    if (results.rows.item(0).count >= 0) {
                        offlineorderscount = results.rows.item(0).count;
                        console.log(offlineorderscount);
                        MyServices.getordersbyzonecount($scope.user.zone).success(
                            function (data, status) {
                                console.log(data);
                                $scope.ordersdown = data.count - offlineorderscount;
                            }
                        );
                    };
                }, function (tx, results) {
                    console.log("result not found");
                });
            });

            //GET NUMBER OF RETAILERS UP
            db.transaction(function (tx) {
                tx.executeSql('SELECT COUNT(*) as `count` FROM `RETAILER` WHERE `issync`=0', [], function (tx, results) {
                    console.log(results.rows.item(0).count)
                    if (results.rows.item(0).count > 0) {
                        $scope.retailersup = results.rows.item(0).count;
                    };
                }, null)
            });

            //GET NUMBER OF RETAILERS DOWN
            db.transaction(function (tx) {
                tx.executeSql('SELECT COUNT(*) as `count` FROM `RETAILER` WHERE `issync`=1', [], function (tx, results) {
                    if (results.rows.item(0).count > 0) {
                        offlineretailercount = results.rows.item(0).count;
                        console.log(offlineretailercount);
                        MyServices.retailergetcount($scope.user.zone).success(
                            function (data, status) {
                                console.log(data);
                                $scope.retailersdown = data.count - offlineretailercount;
                            }
                        );
                    };
                }, function (tx, results) {
                    console.log("result not found");
                });
            });


        };
        /*
        ARRAY FOR RETAILERS
        
    
        
        for (var i = 0; i < results.rows.length; i++) {
    offlineretailerids.push(results.rows.item(i).id);
};
//GET id OF retailers online -> array
*/
        /*
        FNCTION TO GET RETAILER
       */

        /*
        FUNCTION TO GET ORDER UP SYNC NUMBER
        $scope.getorsersynccount = function () {
            MyDatabase.setordersynccount();

            return MyDatabase.getordersynccount();

        };*/
        /*
        FUNCTION TO SEND RETAILER
        MyDatabase.sendnewretailer('SELECT * FROM RETAILER WHERE `issync` = 0', $scope);

        } else {
            $scope.syncordersfunction();
        };*/


        //IMPORT DATA TABLES BUTTON//  

        //FUNCTION TO CHECK WHAT SUCCESS IS LAST
        $scope.importtable = function (whichsuccess) {
            console.log(whichsuccess);
            //$cordovaToast.show(whichsuccess + ' Data Imported', 'long', 'bottom');
            $scope.importtablecount = $scope.importtablecount + 1;
            if ($scope.importtablecount == 7) {
                $scope.it = false;
                $scope.os = true;
                $scope.$apply();
                $scope.preparesync();
            }
        };

        //RETRIEVING DATA INTO TABLES (FIRST TIME)
        //STATE SUCCESS
        syncretailerstatedatasuccess = function (data, status) {
            MyDatabase.insertretailerstatedata(data, $scope);
        };
        //CITY SUCCESS
        syncretailercitydatasuccess = function (data, status) {
            MyDatabase.insertretailercitydata(data, $scope);
        };
        //AREA SUCCESS
        syncretailerareadatasuccess = function (data, status) {
            MyDatabase.insertretailerareadata(data, $scope);
        };
        //RETAILER SUCCESS
        syncretailerdatasuccess = function (data, status) {
            console.log(data.length);
            MyDatabase.insertretailerdata(data, $scope);
        };
        //PRODUCT SUCCESS
        syncproductdatasuccess = function (data, status) {
            MyDatabase.insertproductdata(data, $scope);
        };
        //CATEGORY SUCCESS
        synccategorydatasuccess = function (data, status) {
            //INSERTING DATA IN JSTORAGE
            console.log(data);
            $.jStorage.set("categories", data);
            $scope.categorynamedata = $.jStorage.get("categories");
            console.log($scope.categorynamedata);
            $scope.importtable("Category Names");
        };
        //PRODUCT IMAGE SUCCESS
        syncproductimagedatasuccess = function (data, status) {
            MyDatabase.insertproductimagedata(data, $scope);
        };

        //ORDERS
        syncordersuccess = function (data, status) {
            MyDatabase.insertintoorders(data, $scope);
        };



        $scope.ordersynccount = 0;
        syncordersdatasuccess = function (data, status) {
            $scope.ordersynccount++;
            if ($scope.ordersynccount == $scope.usersinzone) {
                var lastuser = true;
            };
            for (var uo = 0; uo < data.length; uo++) {
                if (lastuser) {
                    if (uo == (data.length - 1)) {
                        MyDatabase.insertorders(data[uo], MyDatabase, lastuser, $scope);
                    } else {
                        MyDatabase.insertorders(data[uo], MyDatabase);
                    }
                } else {
                    MyDatabase.insertorders(data[uo], MyDatabase);
                }
            };
        };

        //USERS IN SAME ZONE SUCCESS
        getusersinsamezonesuccess = function (data, status) {
            console.log(data);
            $scope.usersinzone = data.length;
            for (var uz = 0; uz < data.length; uz++) {
                //ORDERS
                MyDatabase.syncordersdata(data[uz].id).success(syncordersdatasuccess);
            };
        };

        //GET DATA FROM ONLINE API
        $scope.getdatatables = function () {
            $scope.importtablecount = 0;
            //STATE
            MyDatabase.syncinretailerstatedata().success(syncretailerstatedatasuccess);
            //CITY
            MyDatabase.syncinretailercitydata().success(syncretailercitydatasuccess);
            //AREA
            MyDatabase.syncinretailerareadata().success(syncretailerareadatasuccess);
            //RETAILER
            MyDatabase.syncinretailerdata().success(syncretailerdatasuccess);
            //PRODUCT
            MyDatabase.syncinproductdata().success(syncproductdatasuccess);
            //CATEGORIES
            MyDatabase.getcategoriesname().success(synccategorydatasuccess);
            //PRODUCTIMAGE
            MyDatabase.syncinproductimagedata().success(syncproductimagedatasuccess);


            MyServices.getuserzoneorders($scope.user.zone).success(syncordersuccess);


        };

        $scope.ordersget = function () {
            MyServices.getuserzoneorders().success(syncordersuccess);
        };

        //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////






        $scope.updateretailerdata = function () {
            MyDatabase.sendnewretailer('SELECT * FROM RETAILER WHERE `issync` = 0', $scope);
        };

        /*//DUMMY OBJECTS TO STORE RECIEVED DATA
           var sd, cd, ad, rd = [];
           var successretailer = function (data, status) {
               rd = data;
               MyDatabase.getalldata(sd, cd, ad, rd);
           };
           var successarea = function (data, status) {
               ad = data;
               MyDatabase.syncinretailerdata().success(successretailer);
           };
           var successcity = function (data, status) {
               cd = data;
               MyDatabase.syncinretailerareadata().success(successarea);
           };
           var successstate = function (data, status) {
               sd = data;
               MyDatabase.syncinretailercitydata().success(successcity);
           };*/
        //MyDatabase.syncinretailerstatedata().success(successstate);
        //MyDatabase.getalldata();



        /*var type = $cordovaNetwork.getNetwork();
        console.log("The type of network is" + type);
        alert(type);*/
        //SETS VALUE FOR ZONE
        //MyDatabase.findzonebyuseroffline();

        //$scope.retailerdatao = [];
    })
    /*
    .controller('LoginCtrl', function ($scope, $stateParams, MyServices, $location, MyDatabase) {
        $scope.login = {};
        console.log($scope.login)


        var loginSuccess = function (data, status) {
            console.log(data);
            if (data != "false") {
                $location.path("#/app/home");
                MyServices.setuser(data);
            } else {
                $scope.alert = "Username or password incorrect";
            }
        };

        $scope.loginFunction = function (login) {
            MyServices.loginFunc(login).success(loginSuccess);
        };


    })*/
    .controller('LoginCtrl', function ($scope, $stateParams, MyServices, $location, MyDatabase, $cordovaNetwork) {
        $scope.login = {};
        console.log($scope.login)

        $scope.loginFunction = function (login) {

            var loginsuccess = function (data, status) {
                console.log(data);
                if (data != "false") {
                    MyServices.setuser(data);
                    $location.path("#/app/home");
                } else {
                    $scope.alert = "Username or password incorrect";
                };
            };

            //if ($cordovaNetwork.isOffline() == false) {
            MyServices.loginFunc(login).success(loginsuccess);
            //} else {
            //    $scope.alert = "You need an internet connection to login";
            //};

            /*db.transaction(function (tx) {
                console.log(login.password);
                var sqls = 'SELECT * FROM USERS WHERE name = "' + login.username + '"';
                tx.executeSql(sqls, [], function (tx, results) {
                    console.log(results.rows.item(0).password);
                    if (results.rows.item(0).password == login.password) {
                        $location.path("#/app/home");
                        MyServices.setuser(results.rows.item(0));
                    };
                }, function (tx, results) {
                    $scope.alert = "Username or password incorrect";
                });
            });*/
        };


    })

.controller('HomeCtrl', function ($scope, $stateParams, $location, MyServices, $ionicLoading) {


    /*var db = $cordovaSQLite.openDB({ name: "my.db" });
    $scope.execute = function() {
    var query = 'CREATE TABLE IF NOT EXISTS ZONE (id Integer PRIMARY KEY, name, email)';
    $cordovaSQLite.execute(db, query, ["test", 100]).then(function(res) {
      console.log("Table Created");
    }, function (err) {
      console.error(err);
    });
  };*/

    $ionicLoading.hide();

    //GET ZONE DATA
    var user = MyServices.getuser();
    $scope.userzone = user.zone;
    $scope.zonedata = [];
    //$scope.zonedata.id = userzone;

    //SETS VALUE FOR ZONE
    //MyDatabase.findzonebyuseroffline();

    //$ionicSideMenuDelegate.canDragContent(false);

    $scope.logout = function () {
        $.jStorage.flush();
        user = undefined;
        var emptycart = [];
        MyServices.setcart(emptycart);
        MyServices.setretailer(0);

        for (var i = 0; i < 5; i++) {
            var stateObj = {
                foo: "bar"
            };
            history.pushState(stateObj, "page 2", "index.html#/app/login");
        }
        $location.replace();
        window.location.href = window.location.href + "#";
    };
    $scope.user = user;
    $scope.lastretailer = MyServices.getretailer();
    if (!($scope.lastretailer > 0)) {
        $scope.lastretailer = 0;
    }

    $scope.gotolastretailer = function () {
        var pathtolast = "/app/dealer/" + $scope.lastretailer + "/6";
        $location.path(pathtolast);
    };


    db.transaction(function (tx) {
        tx.executeSql('SELECT count(`id`) as `calls`,sum(`amount`) as `amount`,sum(`quantity`) as `quantity`,strftime("%m", `timestamp`) as `month` FROM `orders`  WHERE `salesid`=' + user.id + ' GROUP BY `month`  HAVING `month`=strftime("%m", date("now"))', [], function (tx, results) {
            console.log(results.rows.item(0));
            $scope.monthtallydata = {};
            $scope.monthtallydata.calls = results.rows.item(0).calls;
            $scope.monthtallydata.amount = results.rows.item(0).amount;
            $scope.monthtallydata.quantity = results.rows.item(0).quantity;

            $scope.$apply();

        }, function (tx, results) {
            console.log(results);
        });
    });


    db.transaction(function (tx) {
        tx.executeSql("SELECT count(`id`) as `orders`, strftime('%m', `timestamp`) as `month` FROM `orders` WHERE  `orders`.`quantity`> 0 AND  `salesid`=" + user.id + "  GROUP BY `month` HAVING `month`=strftime('%m', date('now'))", [], function (tx, results) {
            console.log(results.rows.item(0));
            $scope.monthtallydata.orders = results.rows.item(0).orders;

            $scope.$apply();

        }, function (tx, results) {
            console.log(results);
        });
    });



    db.transaction(function (tx) {
        tx.executeSql("SELECT count(`id`) as `calls`,sum(`amount`) as `amount`,sum(`quantity`) as `quantity`,date(`timestamp`) as `date` FROM `orders`  WHERE `salesid`=" + user.id + "   GROUP BY `date`  HAVING `date`=date('now')", [], function (tx, results) {
            console.log(results.rows.item(0));
            $scope.todtallydata = {};
            $scope.todtallydata.calls = results.rows.item(0).calls;
            $scope.todtallydata.amount = results.rows.item(0).amount;
            $scope.todtallydata.quantity = results.rows.item(0).quantity;

            $scope.$apply();

        }, function (tx, results) {
            console.log(results);
        });
    });

    db.transaction(function (tx) {
        tx.executeSql("SELECT count(`id`) as `orders`, date(`timestamp`) as `date` FROM `orders` WHERE  `orders`.`quantity`> 0 AND  `salesid`=" + user.id + "  GROUP BY `date` HAVING `date`=date('now')", [], function (tx, results) {
            console.log(results.rows.item(0));
            $scope.todtallydata.orders = results.rows.item(0).orders;

            $scope.$apply();

        }, function (tx, results) {
            console.log(results);
        });
    });

})

.controller('loaderCtrl', function ($scope, $stateParams, $ionicLoading) {
    console.log('Loading..');
    $ionicLoading.show({
        template: '<h1 class="ion-loading-c"></h1><br>Loading...',
        animation: 'fade-in',
        showBackdrop: true
    });
})



.controller('ZoneCtrl', function ($scope, $stateParams, $http, MyServices) {


    $scope.zonedata = [];
    var onzonesuccess = function (data, status) {
        $scope.zonedata = data;
    };
    MyServices.findzone().success(onzonesuccess);

})

.controller('StateCtrl', function ($scope, $stateParams, $http, MyServices, MyDatabase, $ionicLoading) {

    // zone = 4;
    var zoneID = $stateParams.id;
    $scope.statedata = [];

    db.transaction(function (tx) {
        var sqls = 'SELECT * FROM STATE WHERE "zone" = "' + zoneID + '"';
        tx.executeSql(sqls, [], function (tx, results) {
            for (var i = 0; i < results.rows.length; i++) {
                $scope.statedata.push(results.rows.item(i));
            }
            $ionicLoading.hide();
        }, function (tx, results) {
            console.log("No States");
        });
    });
})

.controller('CityCtrl', function ($scope, $stateParams, $http, MyServices, $ionicLoading) {

    var stateID = $stateParams.id;
    $scope.citydata = [];

    db.transaction(function (tx) {
        var sqls = 'SELECT * FROM CITY WHERE "state" = "' + stateID + '"';
        tx.executeSql(sqls, [], function (tx, results) {
            var length = results.rows.length;
            for (var i = 0; i < length; i++) {
                $scope.citydata.push(results.rows.item(i));
            };
            $ionicLoading.hide();
        }, function (tx, results) {

        });
    });
})

.controller('AreaCtrl', function ($scope, $stateParams, $http, MyServices, $ionicLoading) {

    var cityID = $stateParams.id;
    $scope.areadata = [];
    db.transaction(function (tx) {
        var sqls = 'SELECT * FROM AREA WHERE "city" = "' + cityID + '"';
        tx.executeSql(sqls, [], function (tx, results) {
            var length = results.rows.length;
            for (var i = 0; i < length; i++) {
                $scope.areadata.push(results.rows.item(i));
            }
            $ionicLoading.hide();
        }, function (tx, results) {

        });
    });


})

.controller('RetailerCtrl', function ($scope, $stateParams, $http, MyServices, $location, $ionicLoading) {



    var areaID = $stateParams.id;
    $scope.areaid = areaID;

    MyServices.setareaid(areaID);
    $scope.retailerdata = [];

    db.transaction(function (tx) {
        var sqls = 'SELECT * FROM RETAILER WHERE "area" = "' + areaID + '"';
        tx.executeSql(sqls, [], function (tx, results) {
            var length = results.rows.length;
            for (var i = 0; i < length; i++) {
                $scope.retailerdata.push(results.rows.item(i));
            }
            $ionicLoading.hide();
        }, function (tx, results) {

        });
    });


})

.controller('DealerCtrl', function ($scope, $stateParams, $http, MyServices, MyDatabase, $location, $ionicModal, $window, $ionicLoading) {
    //RETRIEVING DATA FROM JSTORAGE
    $scope.categoryproductdata = {};



    console.log($scope.categoryproductdata);
    //console.log($.jStorage.get("categories"));

    $scope.firstclick = 1;
    $scope.heightVal = $window.innerHeight - 44;

    $scope.params = {};

    //GEO-LOCATION
    var onSuccess = function (position) {
        console.log('Latitude: ' + position.coords.latitude + '\n' +
            'Longitude: ' + position.coords.longitude);

    };

    function onError(error) {
        console.log('code: ' + error.code + '\n' +
            'message: ' + error.message + '\n');
    }
    window.navigator.geolocation.getCurrentPosition(onSuccess, onError, {
        enableHighAccuracy: false
    });

    $scope.total = 0;
    $scope.user = user;

    //CHECK IF NEW RETAILER
    $scope.retailerid = $stateParams.id;
    MyServices.checkretailer($scope.retailerid);
    //SET RETAILER
    MyServices.setretailer($scope.retailerid);
    //GET CART
    $scope.mycart = MyServices.getCart();
    //RETAILER DATA VARIABLE
    $scope.retailerdata2 = [];

    $scope.retailerID = $stateParams.id;
    if ($scope.retailerID == 0) {
        $location.path("/app/home");
    };

    console.log($scope.mycart);

    ////////////////////////////////////////////////////GAINING RETAILER INFO//////////////////////////////////////////////
    //GAINING RETAILER INFORMATION - ONLINE//
    var retailSuccess2 = function (data, status) {
        $scope.firstclick = 0;
        //RETAILER DATA VARIABLE
        $scope.retailerdata2 = data;
        //DEALER EMAIL ID
        $scope.dealeremail = data.distributor;
        //EDIT RETAILER INFO
        $scope.editretailer.ownername = $scope.retailerdata2.ownername;
        $scope.editretailer.ownernumber = $scope.retailerdata2.ownernumber;
        $scope.editretailer.contactname = $scope.retailerdata2.contactname;
        $scope.editretailer.contactnumber = $scope.retailerdata2.contactnumber;
        $scope.editretailer.email = $scope.retailerdata2.email;
    };

    //GAINING RETAILER INFORMATION - OFFLINE//
    var getretailerdataoffline = function () {
        db.transaction(function (tx) {

            var sqls = 'SELECT * FROM RETAILER WHERE "id" = "' + $scope.retailerid + '"';
            tx.executeSql(sqls, [], function (tx, results) {
                var length = results.rows.length;
                for (var i = 0; i < length; i++) {
                    $scope.retailerdata2 = results.rows.item(i);
                    console.log($scope.retailerdata2);
                };
                $ionicLoading.hide();
                $scope.firstclick = 0;
                //DEALER EMAIL ID
                $scope.dealeremail = $scope.retailerdata2.distributor;
                //EDIT RETAILER INFO
                $scope.editretailer.ownername = $scope.retailerdata2.ownername;
                $scope.editretailer.ownernumber = $scope.retailerdata2.ownernumber;
                $scope.editretailer.contactname = $scope.retailerdata2.contactname;
                $scope.editretailer.contactnumber = $scope.retailerdata2.contactnumber;
                $scope.editretailer.email = $scope.retailerdata2.email;
            }, function (tx, results) {});
        });
    };

    //GET RETAILER INFORMATION
    getretailerdataoffline();

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    if (typeof $stateParams.cid != 'string') {
        //CAEGORY AND PRODUCTS
        if ($stateParams.cid > 0) {
            $scope.categoryid = $stateParams.cid;
            MyServices.setcategory($stateParams.cid);
        } else {
            $scope.categoryid = "0";
        };
    } else {
        $scope.categoryid = $stateParams.cid;
        MyServices.setcategory($stateParams.cid);
    };


    //DEFINING THE ARRAY VARIABLE TO STORE PRODUCTS
    $scope.categoryproductdata = {};

    //GIVING VALUES IN VARIABLE - OFFLINE
    var oncategoryproductofflinesuccess = function (data) {
        $ionicLoading.hide();
        console.log("CATEGORY PRODUCTSss");
        console.log(data);
        $scope.categoryproductdata = data;

        db.transaction(function (tx) {
            tx.executeSql("SELECT * FROM `PRODUCTIMAGE` WHERE `product` = " + data.id, [], function (tx, results) {
                    $scope.categoryproductdata.images = [];
                    //PUT ELEMENTS IN TEMPRORY ARRAY
                    for (var i = 0; i < results.rows.length; i++) {
                        console.log(results.rows.item(i));
                        $scope.categoryproductdata.images.push(results.rows.item(i));
                    };
                    $scope.$apply();
                    console.log($scope.categoryproductdata.images);
                },
                function (tx, results) {});
        });
        /*if ($scope.categoryproductdata.scheme2) {
            if ($scope.categoryproductdata.scheme2.name) {
                $scope.categoryname = "Scheme : " + $scope.categoryproductdata.scheme2.name + " (" + $scope.categoryproductdata.scheme2.discount_percent + "%)";
            } else {
                $scope.categoryname = ""
            };
        };*/
    };

    //OFFLINE PRODUCT CALL FUNCTION
    $scope.getnextproduct = function (productid, next) {
        //SHOW LOADER
        $ionicLoading.show();
        //ARRAY TO STORE TEMP PRODUCTS
        var tempproducts = [];
        //VARIABLE TO sTORE SQL QUERY
        var sqls2;
        if (parseInt($scope.categoryid) > 0) {
            sqls2 = 'SELECT * FROM PRODUCT WHERE "category" = "' + $scope.categoryid + '" ORDER BY `id` ASC';
        } else {
            if ($scope.categoryid == "new") {
                sqls2 = 'SELECT * FROM PRODUCT WHERE "isnew" = "1"  ORDER BY `id` ASC';
            } else {
                if ($scope.categoryid == "scheme") {
                    sqls2 = 'SELECT * FROM PRODUCT WHERE "scheme" > 3  ORDER BY `id` ASC';
                } else {
                    var findindicator = $scope.categoryid.charAt(0);
                    if (findindicator == "f") {
                        var value = $scope.categoryid.slice(1);
                        sqls2 = 'SELECT * FROM PRODUCT WHERE name LIKE "%' + value + '%" ORDER BY `id` ASC';
                    };
                };
            };
        };

        //SQL TRANSACTION
        db.transaction(function (tx2) {
            var varid = 0;
            //VAR ID FOR INITIAL PAGE LOAD
            console.log(sqls2);
            tx2.executeSql(sqls2, [], function (tx2, results2) {

                    //PUT ELEMENTS IN TEMPRORY ARRAY
                    for (var i = 0; i < results2.rows.length; i++) {
                        tempproducts.push(results2.rows.item(i));
                    };

                    //OPERATIONS ON TEMPRORY ARRAY
                    for (var j = 0; j < tempproducts.length; j++) {
                        if (productid != 0) {
                            //BECAUSE ON INITIAL PAGE CALL 0 IS BEIGN PASSED AS PRODUCT ID 
                            if (tempproducts[j].id == productid) {
                                if (next == 1) {
                                    if (tempproducts.length > (j + 1)) {
                                        varid = j + 1;
                                    } else {
                                        varid = 0;
                                    };
                                } else {
                                    if ((j - 1) < 0) {
                                        varid = tempproducts.length - 1;
                                    } else {
                                        varid = j - 1;
                                    };
                                };
                            };
                        };
                    };
                    oncategoryproductofflinesuccess(tempproducts[varid]);
                },
                function (tx2, results2) {});
        });
    };

    //INITITAL FUNCTION CALL ON PAGE LOAD FOR PRODUCT
    $scope.getnextproduct(0, 1);

    //SCHEME AND NEW PRODUCTS
    $scope.getscheme = function (cid) {
        MyServices.setsearchtxt("");
        MyServices.setcategory(cid);
        $location.path("/app/dealer/" + $scope.retailerid + "/" + cid);
        $location.replace(); //DONT KEEP HISTORY
    };


    //SEARCH VALUE SHOULD NOT DISSAPEAR FROM INPUT BOX
    var searchtxt = MyServices.getsearchtxt();
    if (searchtxt != "") {
        $scope.searchtext = searchtxt;
    };

    //FUNCTION TO SEARCH PRODUCT
    $scope.searchproduct = function (searchvalue) {
        var retail = MyServices.getretailer();
        MyServices.setsearchtxt(searchvalue);
        console.log(searchvalue);
        var searchtext = "f" + searchvalue;
        MyServices.setcategory(searchtext);
        $location.path("/app/dealer/" + retail + "/" + searchtext);
    };

    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////



    $scope.productquantity = 1;

    //PRODUCT INFORMATION
    var pronumber = 1;
    $scope.pname;
    $scope.pid;
    $scope.pquantity;

    //FUNCTION THAT GIVES COLOR TO LIST
    $scope.giveclass = function (category) {
        var returnval = "";
        if (category == "scheme") {
            returnval = "list list-royal"
        } else if (category == "new") {
            returnval = "list list-energized";
        }
        return returnval;
    };

    ////FUNCTION CALLED WHEN QUANTITY IS CHANGED////
    $scope.changequantity = function (quantity, code, category) {
        var id = -1;
        for (var i = 0; i < $scope.mycart.length; i++) {
            if ($scope.mycart[i].productcode == code && $scope.mycart[i].category == category) {
                id = i;
            };
        }
        if (id >= 0) {
            $scope.mycart[id].quantity = parseInt(quantity);
            var mrp = $scope.mycart[id].mrp;
            $scope.mycart[id].totalprice = $scope.mycart[id].quantity * mrp;
            MyServices.setcart($scope.mycart);
        }
    };

    ////////RECENT RETAILER DATA//////////
    db.transaction(function (tx) {
        tx.executeSql('SELECT * FROM `ORDERS` WHERE `retail` = "' + $scope.retailerid + '" ORDER BY `id` DESC LIMIT 3', [], function (tx, results) {
            $scope.retailerrecentdata = [];
            for (var rrd = 0; rrd < results.rows.length; rrd++) {
                $scope.retailerrecentdata[rrd] = results.rows.item(rrd);
            };
        }, null)
    });
    /////////////////////////////////////

    //GET TOTAL FUNCTION
    $scope.gettotal = function () {
        var total = 0;
        for (var i = 0; i < $scope.mycart.length; i++) {
            total += $scope.mycart[i].totalprice;
        }
        return total;
    };


    //total quantity
    $scope.gettotalquantity = function () {
        $scope.quantitytotal = 0;
        for (var i = 0; i < $scope.mycart.length; i++) {
            $scope.quantitytotal += parseInt($scope.mycart[i].quantity);
        };
        return $scope.quantitytotal;
    };


    //INITIAL CALLING PRODUCTS ON PAGE LOAD
    $scope.choice = "scheme";



    //TOP TEN ORDERS////////////////////////////////////////
    $scope.toptendata = [];
    $ionicModal.fromTemplateUrl('templates/topten.html', {
        id: '1',
        scope: $scope,
        animation: 'slide-in-up'
    }).then(function (modal) {
        $scope.oModal1 = modal;
    });
    var toptendatasuccess = function (data, status) {
        console.log(data);
        $scope.toptendata = data;
        $ionicLoading.hide();
    };
    $scope.gettopten = function () {
        $scope.toptendata = [];
        $scope.oModal1.show();
        db.transaction(function (tx) {
            var sqls = 'SELECT * FROM TOPTEN';
            tx.executeSql(sqls, [], function (tx, results) {
                for (var i = 0; i < results.rows.length; i++) {
                    $scope.toptendata.push(results.rows.item(i));
                };
                $scope.$apply();
            }, function (tx, results) {});
        });
    };
    //////////////END OF TOP TEN////////////////////////////////

    //EDIT RETAILERS
    $scope.editretailer = {};
    $scope.editretailer.id = $scope.retailerID;
    console.log("retailer name is " + $scope.retailerID);

    $ionicModal.fromTemplateUrl('templates/editretailer.html', {
        id: '2',
        scope: $scope,
        animation: 'slide-in-up'
    }).then(function (modal) {
        $scope.oModal2 = modal;
    });
    var editretailersuccess = function (data, status) {
        console.log(data);
        $scope.oModal2.hide();
    };
    $scope.gettopen = function () {
        $scope.oModal2.show();
    };
    $scope.editRetailerFunction = function () {
        console.log($scope.editretailer.number);
        //if (offline) {
        MyDatabase.editaretailer($scope.editretailer, $scope.retailerdata2.name, $scope);

        //} else {
        //    MyServices.editretailerdetails($scope.editretailer).success(editretailersuccess);
        //};

        $scope.oModal2.hide();
    };


    //USPs
    $ionicModal.fromTemplateUrl('templates/usp.html', {
        id: '3',
        scope: $scope,
        animation: 'slide-in-up'
    }).then(function (modal) {
        $scope.oModal3 = modal;
    });
    $scope.closeusp = function () {
        $scope.oModal3.hide();
    };
    $scope.openusp = function () {
        $scope.oModal3.show();
    };

    $ionicModal.fromTemplateUrl('templates/recent-orders.html', {
        id: '4',
        scope: $scope,
        animation: 'slide-in-up'
    }).then(function (modal) {
        $scope.oModal4 = modal;
    });
    $scope.closerecent = function () {
        $scope.oModal4.hide();
    };
    $scope.openrecent = function () {
        $scope.oModal4.show();
    };


    /*    //PREVIOUS BUTTON
    $scope.getpreviousproduct = function () 
    {
        console.log("SENDING ID " + $scope.pid);
        MyServices.findnext($scope.pid, 0).success(oncategoryproductsuccess);
    };*/

    /*    //NEXT AND id
    var onnextid = function (data) {
        $scope.newnid = data.id;
        console.log("getting id: " + data.id);
        
        //findproduct(data.id);
    };
    var onpreviousid = function (data) {
        $scope.newnid = data.id;
        console.log("getting id: " + data.id);
        findproduct(data.id);
    }*/



    //$scope.productquantity = 1;


    $scope.cartnotschemenew = function (category, $index) {
        //console.log("CATEGORY>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>");
        //console.log(category);
        if (category.category == "new" || category.category == "scheme") {
            return false;
        } else {
            return true;
        }
    };

    //ADD TO CART
    $scope.addToCart = function (id, productcode, name, quantity, mrp) {

        $scope.totalprice = quantity * mrp;
        //$scope.total += totalprice;
        if (quantity > 0) {
            MyServices.addItemToCart(id, productcode, name, quantity, mrp, $scope.totalprice);
            $scope.mycart = MyServices.getCart();
            //console.log("YOUR CART "+ mycart);+
        };
    };

    //REMOVE FROM CART
    $scope.remove = function (id, category) {
        for (var i = 0; i < $scope.mycart.length; i++) {
            if ($scope.mycart[i].id == id && $scope.mycart[i].category == category) {
                MyServices.removeObject(i);
                return false;
            }
        }
        console.log("REMOVE FUNCITON CALLED");
    };


    //E-mail FUNCTION
    var email = function () {
        console.log("email function params");
        console.log($scope.params);
        var onemailsuccess = function (data, status) {
            //alert(data);
            console.log("in email fucntion");
            console.log(data);
        };

        if ($scope.mycart.length > 0) {
            //            MyServices.sendemail($scope.params).success(onemailsuccess);
            //            MyServices.sendorderemail($scope.params).success(emailsend);
        };
    };

    /*
    //SMS
    var sms = function () {
        if ($scope.mycart.length > 0) {
            //var smsnumber2 = "9029796018";
            //SMS IMPLEMENTATION
            var smssuccess = function (data, status) {
                console.log(data);
            };

            if ($scope.number1 != null) {
                $scope.number1.toString();
                console.log("number one to sting");
                if ($scope.number1.length == 10) {
                    $scope.number1 = "91" + $scope.number1;
                }
                var smscall = 'http://bulksms.mysmsmantra.com:8080/WebSMS/SMSAPI.jsp?username=toykraft &password=1220363582&sendername=TYKRFT&mobileno=' + $scope.number1 + '&message=Dear Customer, We thank you for your order. The order for' + $scope.emailtotalquantity + 'pcs with MRP value of Rs' + $scope.emailtotalvalue + 'is under process. Team Toykraft';
                MyServices.sendsms(smscall).success(smssuccess);
            };

            if ($scope.number2 != null) {
                $scope.number2.toString();
                if ($scope.number2.length == 10) {
                    $scope.number2 = "91" + $scope.number2;
                    console.log($scope.number2);
                }
                var smscall2 = 'http://bulksms.mysmsmantra.com:8080/WebSMS/SMSAPI.jsp?username=toykraft &password=1220363582&sendername=TYKRFT&mobileno=' + $scope.number2 + '&message=Dear Customer, We thank you for your order. The order for ' + $scope.emailtotalquantity + ' pcs with MRP value of Rs.' + $scope.emailtotalvalue + ' is under process. Team Toykraft';
                MyServices.sendsms(smscall2).success(smssuccess);

            };
        }
    };
    */

    //ONLINE - ORDER SUCCESS
    var emailsend = function (data, status) {
        console.log(data);
    };
    var smssuccess = function (data, status) {
        console.log(data);
    };
    var orderSuccess = function (data, status) {
        console.log("ordersuccess return data");
        console.log($scope.mycart.length);
        MyServices.sendorderemail(data.id, data.retail, data.amount, data.sales, data.timestamp, data.quantity, data.remark).success(emailsend);
        $scope.emailtotalquantity = 0;
        $scope.emailtotalvalue = 0;
        for (var e = 0; e < $scope.mycart.length; e++) {
            $scope.emailtotalquantity += parseInt($scope.mycart[e].quantity);
            $scope.emailtotalvalue += $scope.mycart[e].totalprice;
        }

        /////////////////////////////////////////////////////////////////////////////////////////////////////
        /*var datetime = data.timestamp;
        var orderid = data.id;

        $scope.emaildata = '<p>Dear Distributor / Retailer,<br>Our sales executive ' + userdata.name + ' has booked an order with details as below:</p><p><strong>Order id: </strong>' + orderid + ' </p> <p><strong>Order placed on: </strong>' + datetime + ' </p> <p><strong>' + $scope.retailerdata2.name + '</strong></p> <p><strong>' + $scope.retailerdata2.address + '</strong></p> <table class="table2" style="width:100%"><thead style="text-align:center;"> <tr> <th> Sr.no. </th> <th> Product Code </th> <th> Name </th> <th> Quantity </th> <th> MRP </th> <th> Amount </th> <th> Scheme </th> </tr></thead><tbody style="text-align:center;">';

        $scope.emailtotalquantity = 0;
        $scope.emailtotalvalue = 0;
        var index = 1;
        //E-MAIL
        for (var e = 0; e < $scope.mycart.length; e++) {
            $scope.emaildata += "<tr>";
            $scope.emaildata += "<td>" + index + "</td>";
            index++;
            $scope.emaildata += "<td>" + $scope.mycart[e].productcode + "</td>";
            $scope.emaildata += "<td>" + $scope.mycart[e].name + "</td>";
            $scope.emaildata += "<td>" + $scope.mycart[e].quantity + "</td>";
            $scope.emailtotalquantity += parseInt($scope.mycart[e].quantity);
            $scope.emaildata += "<td>₹ " + $scope.mycart[e].mrp + "</td>";
            $scope.emaildata += "<td>₹ " + $scope.mycart[e].totalprice + "</td>";
            $scope.emailtotalvalue += $scope.mycart[e].totalprice;
            if ($scope.mycart[e].category == "scheme") {
                $scope.emaildata += "<td> YES </td>";
            } else {
                $scope.emaildata += "<td> NO </td>";
            };
            $scope.emaildata += "</tr>";
        }

        $scope.emaildata += "<tr>";

        $scope.emaildata += "<td></td>";
        $scope.emaildata += "<td></td>";
        $scope.emaildata += "<td><strong>Total: </strong></td>";
        $scope.emaildata += "<td><strong>" + $scope.emailtotalquantity + "</strong></td>";
        $scope.emaildata += "<td></td>";
        $scope.emaildata += "<td><strong>₹ " + $scope.emailtotalvalue + "</strong></td>";
        $scope.emaildata += "<td></td>";

        $scope.emaildata += "</tr>";
        $scope.emaildata += "</tbody></table>";
        console.log($scope.emaildata);

        var subject = "Order placed. Order Id.: " + orderid;



        //EMAIL SETTING
        if ($scope.retailerdata2.email == null) {
            var retaileremail = $scope.useremail
        } else {
            var retaileremail = $scope.retailerdata2.email
        };
        if ($scope.dealeremail == null) {
            var dealeremail = $scope.useremail
        } else {
            var dealeremail = $scope.dealeremail
        };

        var emailArray = [{
            email: dealeremail,
            name: 'Distributor'
        }, {
            email: retaileremail,
            name: $scope.retailerdata2.name
        }];
        $scope.params = {
            "key": "cGE4EC2IdBhogNPk6e6-Xg",
            "template_name": "ordertemplate",
            "template_content": [{
                "name": "table",
                "content": $scope.emaildata
            }],
            "message": {
                "subject": subject,
                "to": "jagruti@wohlig.com",
                "headers": {
                    "Reply-To": "noreply@toy-kraft.com"
                },
                "important": true,
                //"bcc_address": $scope.dealeremail,
                "global_merge_vars": [{
                    "name": "merge1",
                    "content": "merge1 content"
                }],
                "recipient_metadata": [{
                    "rcpt": retaileremail,
                    "values": {
                        "user_id": 123456
                    }
                }]
            },
            "async": false
        };

        //email();*/
        if ($scope.mycart.length > 0) {
            MyServices.sms($scope.number1, $scope.number2, $scope.emailtotalquantity, $scope.emailtotalvalue).success(smssuccess);
        };

        MyServices.clearcart();
        MyServices.setretailer(0);

        $scope.aid = MyServices.getareaid();
        if ($scope.aid > 0) {
            $location.path("/app/retailer/" + $scope.aid);
        } else {
            $location.path("/app/home");
        };
    };

    var userdata = MyServices.getuser();
    console.log(userdata);
    $scope.useremail = userdata.email;



    $scope.sendOrder = function (retailerdata2) {
        if ($scope.firstclick == 0) {
            $scope.firstclick = 1;
            var u = MyServices.getuser();
            var c = MyServices.getCart()
            console.log(u);
            console.log(c);
            console.log(retailerdata2.remark);
            MyDatabase.sendcartoffline(retailerdata2, u, c);

            //MyServices.sendOrderNow(retailerdata2).success(orderSuccess);
        };

        $ionicLoading.show({
            template: '<h1 class="ion-loading-c"></h1><br>Sendig order...',
            animation: 'fade-in',
            showBackdrop: true
        });
    };



    //RETRIEVE DATA
    $scope.retrieveData = function () {
        console.log(MyServices.getData());
        //console.log(display);
    };

})

.controller('ViewallCtrl', function ($scope, $stateParams, MyServices, $ionicLoading) {
    $scope.noorder = true;
    var userorders = function (data, status) {
        $ionicLoading.hide();
        if (data != "false") {
            $scope.userordersdata = data;
        } else {
            $scope.noorder = false;
            console.log("noorder is true");
        };
    };
    MyServices.getuserorders(user.id).success(userorders);


})

.controller('OrderCtrl', function ($scope, $stateParams, MyServices, $ionicModal, $location, $ionicLoading, $ionicPopup, $timeout, MyDatabase) {
    $ionicLoading.hide();
    // var ismodalclosed=false;
    //$scope.ordersdata = 'false';

    var user = MyServices.getuser();
    console.log(user);
    $scope.useremail = user.email;

    var onemailsuccess = function (data, status) {
        //alert(data);
        console.log(data);
        alert("e-mail has been sent");
    };


    var emailsend = function (data, status) {
        console.log(data);
        console.log($scope.number1);
        console.log($scope.number2);
        if ($scope.mycart.length > 0) {
            MyServices.sms($scope.number1, $scope.number2, $scope.emailtotalquantity, $scope.emailtotalvalue).success(function (data, status) {
                console.log(data);
            });

        };

    };


    var email = function (data) {
        console.log("im in email function");
        console.log(data);
        MyServices.sendorderemail(data.id, data.retail, data.amount, data.sales, data.timestamp, data.quantity, data.remark).success(emailsend);
        // $scope.emaildata = '<p>Dear Distributor / Retailer,<br>Our sales executive ' + user.name + ' has booked an order with details as below:</p><p><strong>Order id: </strong>' + data.id + ' </p> <p><strong>Order placed on: </strong>' + datetime + ' </p> <p><strong>' + $scope.retailerdata2.name + '</strong></p> <p><strong>' + $scope.retailerdata2.address + '</strong></p> <table class="table2" style="width:100%"><thead style="text-align:center;"> <tr> <th> Sr.no. </th> <th> Product Code </th> <th> Name </th> <th> Quantity </th> <th> MRP </th> <th> Amount </th> <th> Scheme </th> </tr></thead><tbody style="text-align:center;">';

        //        $scope.emailtotalquantity = 0;
        //        $scope.emailtotalvalue = 0;
        //        var index = 1;
        //        //E-MAIL
        //        for (var e = 0; e < $scope.mycart.length; e++) {
        //            $scope.emaildata += "<tr>";
        //
        //            $scope.emaildata += "<td>" + index + "</td>";
        //            index++;
        //            $scope.emaildata += "<td>" + $scope.mycart[e].productcode + "</td>";
        //            $scope.emaildata += "<td>" + $scope.mycart[e].name + "</td>";
        //            $scope.emaildata += "<td>" + $scope.mycart[e].quantity + "</td>";
        //            $scope.emailtotalquantity += parseInt($scope.mycart[e].quantity);
        //            $scope.emaildata += "<td>₹ " + ($scope.mycart[e].amount / $scope.mycart[e].quantity) + "</td>";
        //            $scope.emaildata += "<td>₹ " + $scope.mycart[e].amount + "</td>";
        //            $scope.emailtotalvalue += $scope.mycart[e].amount;
        //            if ($scope.mycart[e].category == "scheme") {
        //                $scope.emaildata += "<td> YES </td>";
        //            } else {
        //                $scope.emaildata += "<td> NO </td>";
        //            };
        //            $scope.emaildata += "</tr>";
        //        }
        //
        //        $scope.emaildata += "<tr>";
        //
        //        $scope.emaildata += "<td></td>";
        //        $scope.emaildata += "<td></td>";
        //        $scope.emaildata += "<td><strong>Total: </strong></td>";
        //        $scope.emaildata += "<td><strong>" + $scope.emailtotalquantity + "</strong></td>";
        //        $scope.emaildata += "<td></td>";
        //        $scope.emaildata += "<td><strong>₹ " + $scope.emailtotalvalue + "</strong></td>";
        //        $scope.emaildata += "<td></td>";
        //
        //        $scope.emaildata += "</tr>";
        //        $scope.emaildata += "</tbody></table>";
        //        console.log($scope.emaildata);
        //
        //        var subject = "Order placed. Order ID:" + $scope.orderID;
        //
        //        $scope.params = {};
        //
        //
        //        //EMAIL SETTING
        //        if ($scope.retailerdata.email == null) {
        //            var retaileremail = $scope.useremail
        //        } else {
        //            var retaileremail = $scope.retailerdata.email
        //        };
        //        if ($scope.distributoremail == null) {
        //            var dealeremail = $scope.useremail
        //        } else {
        //            var dealeremail = $scope.distributoremail
        //        };
        //
        //        var emailArray = [{
        //            email: dealeremail,
        //            name: 'Distributor'
        //        }, {
        //            email: retaileremail,
        //            name: $scope.retailerdata.name
        //        }];
        //        $scope.params = {
        //            "key": "cGE4EC2IdBhogNPk6e6-Xg",
        //            "template_name": "ordertemplate",
        //            "template_content": [
        //                {
        //                    "name": "table",
        //                    "content": $scope.emaildata
        //        }
        //    ],
        //            "message": {
        //                "subject": subject,
        //                "to": "jagruti@wohlig.com",
        //                "headers": {
        //                    "Reply-To": "noreply@toy-kraft.com"
        //                },
        //                "important": true,
        //                //"bcc_address": "contactabhay2@gmail.com",//dealeremail,
        //                "global_merge_vars": [
        //                    {
        //                        "name": "merge1",
        //                        "content": "merge1 content"
        //            }
        //        ],
        //                "recipient_metadata": [
        //                    {
        //                        "rcpt": "tushar@wohlig.com", //retaileremail,
        //                        "values": {
        //                            "user_id": 123456
        //                        }
        //                            }
        //        ]
        //            },
        //            "async": false
        //        };
        //
        //        
        //
        //        if ($scope.mycart.length > 0) {
        //           // MyServices.sendemail($scope.params).success(onemailsuccess);
        //        };
    };

    var orderdetails = function (data, status) {
        console.log("resend email success");
        console.log(data);
        $scope.retailerdata = data.retailer;
        $scope.distributoremail = data.retailer.distributor;
        $scope.retaileremail = data.retailer.email;
        $scope.number1 = data.retailer.ownernumber;
        $scope.number2 = data.retailer.contactnumber;

        $scope.mycart = data.orderproduct;
        $scope.user = data.sales;
        $scope.total = data.amount;
        $scope.timestamp = data.timestamp;

        email(data);
        console.log(data);
        console.log($scope.retailerdata);
        console.log($scope.mycart);
        console.log($scope.user);
        console.log($scope.total);

        //resend popup
        var myPopup = $ionicPopup.show({
            template: '<center><h3>Order Resend !</h3></center>',
            title: 'Hurray!',
            scope: $scope
        });
        myPopup.then(function (res) {
            console.log('Tapped!', res);
        });
        $timeout(function () {
            myPopup.close(); //close the popup after 3 seconds for some reason
        }, 2000);
    };

    //RESEND EMAIL
    $scope.resendemail = function (orderid) {
        $scope.orderID = orderid;
        MyServices.getorderdetail(orderid).success(orderdetails);
        /*db.transaction(function (tx) {
            tx.executeSql('SELECT * FROM ORDERS WHERE id=' + orderid, [], function (tx, results) {
                    console.log(results.rows.length);
                orderdetails(results.rows.item(0));
                },

                function (tx, results) {
                    console.log('error');
            }
                );
        });*/
    };

    $scope.recart = [];
    //ADD TO CART FUNCTION
    $scope.addToCart = function (id, productcode, name, quantity, mrp) {

        $scope.totalprice = quantity * mrp;
        //$scope.total += totalprice;
        if (quantity > 0) {

            MyServices.addItemToCart(id, productcode, name, quantity, mrp, $scope.totalprice);
            $scope.newcart = MyServices.getCart();
            console.log("YOUR CART " + $scope.newcart);
        };

    };

    //REORDER ORDER
    $scope.reorder = function (retailerid, synccart, user) {
        // console.log(data);
        $scope.retailerid = retailerid;
        MyServices.setretailer($scope.retailerid);
        MyServices.setcart($scope.recart);
        // $scope.recart = data.orderproduct;
        $scope.recart = synccart;
        for (i = 0; i < $scope.recart.length; i++) {
            $scope.addToCart($scope.recart[i].id, $scope.recart[i].productcode, $scope.recart[i].name, $scope.recart[i].quantity, $scope.recart[i].amount);
        };
        $location.path("/app/dealer/" + $scope.retailerid + "/6");

    };

    $scope.resendorder = function (orderid) {
        $scope.orderID = orderid;

        var getcart = function (oid) {
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

                    MyDatabase.retaileridforreorder(orderid, synccart, $scope, MyDatabase);
                }, null);
            });
        };
        getcart(orderid);

        //  MyServices.getorderdetail(orderid).success(reorder);

    };

    console.log(user.zone);
    var zid = user.zone;

    $scope.filter = {
        state: "",
        city: "",
        area: "",
        retailer: ""
    };

    $scope.ordersdata = 'false';
    $scope.statedata = [];
    $scope.citydata = [];
    $scope.areadata = [];
    $scope.retailerdata = [];
    //STATE

    /* statesuccess = function (data, status) {
         console.log(data);
         $scope.statedata = data;
     };*/
    // MyServices.findstate(zid).success(statesuccess);
    MyDatabase.findstates(zid, $scope);
    //CITY

    /*citysuccess = function (data, status) {
        $scope.citydata = data;
    };*/
    $scope.statechange = function (sid) {
        $scope.citydata = [];
        // MyServices.findcity(sid).success(citysuccess);
        MyDatabase.findcity(sid, $scope);
    };
    //AREA


    /*areasuccess = function (data, status) {
        $scope.areadata = data;
    };*/
    $scope.citychange = function (cid) {
        $scope.areadata = [];
        // MyServices.findarea(cid).success(areasuccess);
        MyDatabase.findarea(cid, $scope);
    };
    //RETAILER

    /*retailersuccess = function (data, status) {
        $scope.retailerdata = data;

    };*/
    retailersuccessini = function (data, status) {
        $scope.retailerdata = data;
    };
    $scope.areachange = function (aid) {
        $scope.retailerdata = [];
        // MyServices.findretailer(aid).success(retailersuccess);
        MyDatabase.findretailer(aid, $scope);
    };

    $scope.resettoold = function () {
        $scope.filter = {
            zone: "4",
            state: "27",
            city: "1",
            area: "1",
            retailer: "1"
        };
    };
    $scope.resettoold2 = function () {
        $scope.filter = {
            zone: "",
            state: "",
            city: "",
            area: "",
            retailer: ""
        };
    };

    //GET RETAILER DATA
    $scope.retailerdatasuccess = function (data) {
        console.log("called");
        console.log(data);
        $scope.ordersdata = data;
        $scope.filter = {
            zone: "",
            state: "",
            city: "",
            area: "",
            retailer: ""
        };
        $scope.filter = MyServices.getmyorderretailer();
        console.log($scope.filter);
    };
    $scope.retailerchange = function (filter) {
        console.log($scope.ismodalclosed);
        MyServices.setmyorderretailer(filter);
        MyServices.setmyorderdate(false);

        // MyServices.getretailerdata(filter.retailer).success(retailerdatasuccess);
        MyDatabase.getdatabyretailer(filter.retailer, $scope);
        if ($scope.ismodalclosed == false) {
            $scope.closeRetailer();
        };
    };

    //GET DATA BY DATE
    /* datedatasuccess = function (data, status) {
         $scope.ordersdata = data;

     };*/
    $scope.datechange = function (did) {
        console.log(did);
        MyServices.setmyorderdate(did);
        MyDatabase.getdatedata(did, MyServices.getuser(), $scope); //.success(datedatasuccess);
        // MyServices.getdatedata(did).success(datedatasuccess);
        $scope.closeDate();
    };

    $scope.selecteddate = MyServices.getmyorderdate();

    if (MyServices.getmyorderdate()) {
        MyDatabase.getdatedata(MyServices.getmyorderdate(), MyServices.getuser(), $scope);
    } else if (MyServices.getmyorderretailer().retailer != "") {
        console.log("else condition");
        //$scope.filter=MyServices.getmyorderretailer();
        // MyServices.findzone().success(zonesuccess);
        /* MyServices.findstate(MyServices.getmyorderretailer().zone).success(statesuccess);
         MyServices.findcity(MyServices.getmyorderretailer().state).success(citysuccess);
         MyServices.findarea(MyServices.getmyorderretailer().city).success(areasuccess);
         MyServices.findretailer(MyServices.getmyorderretailer().area).success(retailersuccessini);*/
        MyDatabase.findstates(MyServices.getmyorderretailer().zone, $scope);
        MyDatabase.findcity(MyServices.getmyorderretailer().state, $scope);
        MyDatabase.findarea(MyServices.getmyorderretailer().city, $scope);
        MyDatabase.findretailer(MyServices.getmyorderretailer().area, $scope);
        $scope.retailerchange(MyServices.getmyorderretailer());
    };

    //MyServices.getuserorders(user.id).success(userorders);

    //    Sorting Modals

    // Date Modal
    $ionicModal.fromTemplateUrl('templates/sort-date.html', {
        id: '1',
        scope: $scope,
        animation: 'slide-in-up'
    }).then(function (modal) {
        $scope.oModal1 = modal;
    });
    $scope.openDate = function () {
        $scope.oModal1.show();
    };
    $scope.closeDate = function () {
        $scope.oModal1.hide();
    };

    // Retailer Modal 
    $ionicModal.fromTemplateUrl('templates/sort-retailer.html', {
        id: '2',
        scope: $scope,
        animation: 'slide-in-up'
    }).then(function (modal) {
        $scope.oModal2 = modal;
    });
    $scope.openRetailer = function () {

        $scope.oModal2.show();
        $scope.ismodalclosed = false;
        console.log($scope.ismodalclosed);

    };
    $scope.closeRetailer = function () {
        $scope.oModal2.hide();
        $scope.ismodalclosed = true;
        console.log($scope.ismodalclosed);
    };


})

.controller('OrderdetailCtrl', function ($scope, $stateParams, MyServices, $ionicLoading, MyDatabase) {

    var orderID = $stateParams.id;
    //console.log(user);
    $scope.orderdetails = function (data) {

        console.log("called");
        console.log(data[0].orderdata.amount);
        $ionicLoading.hide();
        $scope.user = data[0].orderdata.sales;
        $scope.total = data[0].orderdata.amount;
        $scope.retailerdata = data[0].retailerdata;
        $scope.orderdetailsdata = data[0].orderproductdata;
        console.log($scope.orderdetailsdata);
        console.log($scope.retailerdata);
        $scope.gettotalquantity();

    };
    // MyServices.getorderdetail(orderID).success(orderdetails);
    MyDatabase.getorderdetail(orderID, MyDatabase, $scope);

    $scope.gettotalquantity = function () {
        $scope.quantitytotal = 0;
        for (var i = 0; i < $scope.orderdetailsdata.length; i++) {
            $scope.quantitytotal += parseInt($scope.orderdetailsdata[i].quantity);
        };
        return $scope.quantitytotal;
    };

    //FUNCTION TO DISPLAY PRODUCTS FILTER
    $scope.cartnotschemenew = function (category, $index) {
        if (category.category == "new" || category.category == "scheme") {
            return false;
        } else {
            return true;
        }
    };

})

.controller('AddshopCtrl', function ($scope, $stateParams, $cordovaCamera, $cordovaFile, $http, MyServices, MyDatabase, $location, $ionicLoading, $cordovaGeolocation, $cordovaNetwork) {

        $ionicLoading.hide();

        var aid = $stateParams.areaid;

        db.transaction(function (tx) {
            tx.executeSql('SELECT `name` FROM AREA WHERE `id`=' + aid, [], function (tx, results) {
                $scope.areaname = results.rows.item(0).name;
                console.log($scope.areaname);
            }, null)
        });

        $scope.firstclick = 0;

        $scope.filename2 = "";

        $cordovaGeolocation.getCurrentPosition().then(function (position) {
            $scope.addretailer.lat = '' + position.coords.latitude + '';
            $scope.addretailer.long = '' + position.coords.longitude + '';
        }, function (err) {
            // error
            alert("GPS is off");
        });

        $scope.addretailer = {};
        $scope.addretailer.area = aid;
        $scope.addretailer.name = '';
        $scope.addretailer.number = '';
        $scope.addretailer.address = '';
        $scope.addretailer.code = '';
        $scope.addretailer.contactname = '';
        $scope.addretailer.contactnumber = '';
        $scope.addretailer.ownername = '';
        $scope.addretailer.ownernumber = '';
        $scope.addretailer.dob = '';
        $scope.addretailer.type_of_area = '';
        $scope.addretailer.sq_feet = '';
        $scope.addretailer.store_image = '';
        $scope.addretailer.lat = '';
        $scope.addretailer.long = '';


        $scope.addRetailerFunction = function () {
            if ($scope.firstclick == 0) {
                $scope.firstclick = 1;

                /*function addRetailerSuccess(data, status) {
                    //SUCCESS
                    console.log(data);

                    //REDIRECT
                    var pathToGo = "/app/retailer/" + aid;
                    $location.path(pathToGo);

                };*/

                MyDatabase.addnewretailer($scope.addretailer);

            }
        };


        //Capture Image
        $scope.takePicture = function () {
            var options = {
                quality: 20,
                destinationType: Camera.DestinationType.FILE_URI,
                sourceType: Camera.PictureSourceType.CAMERA,
                allowEdit: true,
                encodingType: Camera.EncodingType.JPEG,
                saveToPhotoAlbum: true
            };

            $cordovaCamera.getPicture(options).then(function (imageData) {
                // Success! Image data is here
                $scope.cameraimage = imageData;
                $scope.uploadPhoto();
            }, function (err) {
                // An error occured. Show a message to the user
            });

            //Upload photo
            var server = 'http://wohlig.biz/Toykraftbackend/index.php/json/uploadfile';

            //File Upload parameters: source, filePath, options
            $scope.uploadPhoto = function () {
                console.log("function called");
                $cordovaFile.uploadFile(server, $scope.cameraimage, options)
                    .then(function (result) {
                        console.log(result);
                        result = JSON.parse(result.response);
                        filenameee = result;
                        $scope.filename2 = result.file_name;
                        $scope.addretailer.store_image = $scope.filename2;

                    }, function (err) {
                        // Error
                        console.log(err);
                        console.log("Error");
                    }, function (progress) {
                        // constant progress updates
                    });

            };

        }
    })
    .controller('PhotoSliderCtrl', function ($scope, $stateParams, MyServices, $ionicModal, $ionicSlideBoxDelegate, $ionicLoading) {
        $ionicLoading.hide();
        $ionicModal.fromTemplateUrl('templates/image-slider.html', {
            scope: $scope,
            animation: 'slide-in-up'
        }).then(function (modal) {
            $scope.modal = modal;
        });

        $scope.openModal = function (index2) {

            $scope.modal.show();
            // Important: This line is needed to update the current ion-slide's width
            // Try commenting this line, click the button and see what happens

            $ionicSlideBoxDelegate.start();
            $ionicSlideBoxDelegate.update();
            for (var i = 0; i < 20; i++) {
                $ionicSlideBoxDelegate.previous();
            }
            for (var i = 0; i < index2; i++) {
                $ionicSlideBoxDelegate.next();
            }

        };

        $scope.closeModal = function () {
            $scope.modal.hide();
        };

        // Cleanup the modal when we're done with it!
        $scope.$on('$destroy', function () {
            $scope.modal.remove();
        });
        // Execute action on hide modal
        $scope.$on('modal.hide', function () {
            // Execute action
        });
        // Execute action on remove modal
        $scope.$on('modal.removed', function () {
            // Execute action
        });
        $scope.$on('modal.shown', function () {
            console.log('Modal is shown!');
        });

        // Call this functions if you need to manually control the slides
        $scope.next = function () {
            $ionicSlideBoxDelegate.next();
        };

        $scope.previous = function () {
            $ionicSlideBoxDelegate.previous();
        };

        // Called each time the slide changes
        $scope.slideChanged = function (index) {
            $scope.slideIndex = index;
        };
    });