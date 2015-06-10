// Ionic Starter App

// angular.module is a global place for creating, registering and retrieving Angular modules
// 'starter' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'
// 'starter.controllers' is found in controllers.js
var starter = angular.module('starter', ['ionic', 'starter.controllers', 'ngCordova', 'myservices', 'mydatabase'])

.run(function ($ionicPlatform) {
    $ionicPlatform.ready(function () {
        // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
        // for form inputs)
        if (window.cordova && window.cordova.plugins.Keyboard) {
            cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
        }
        if (window.StatusBar) {
            // org.apache.cordova.statusbar required
            StatusBar.styleDefault();
        }
    });
})

.config(function ($stateProvider, $urlRouterProvider) {
    $stateProvider

    .state('app', {
        url: "/app",
        abstract: true,
        templateUrl: "templates/menu.html",
        controller: 'AppCtrl'
    })

    .state('app.login', {
        url: "/login",
        views: {
            'menuContent': {
                templateUrl: "templates/login.html",
                controller: 'LoginCtrl'
            }
        }
    })
        .state('app.home', {
            url: "/home",
            views: {
                'menuContent': {
                    templateUrl: "templates/home.html",
                    controller: 'HomeCtrl'
                }
            }
        })
        .state('app.sync', {
            url: "/sync",
            views: {
                'menuContent': {
                    templateUrl: "templates/sync.html",
                    controller: 'syncCtrl'
                }
            }
        })
        .state('app.zone', {
            url: "/zone",
            views: {
                'menuContent': {
                    templateUrl: "templates/zone.html",
                    controller: 'ZoneCtrl'
                }
            }
        })
        .state('app.state', {
            url: "/state/:id",
            views: {
                'menuContent': {
                    templateUrl: "templates/state.html",
                    controller: 'StateCtrl'
                }
            }
        })
        .state('app.city', {
            url: "/city/:id",
            views: {
                'menuContent': {
                    templateUrl: "templates/city.html",
                    controller: 'CityCtrl'
                }
            }
        })
        .state('app.area', {
            url: "/area/:id",
            views: {
                'menuContent': {
                    templateUrl: "templates/area.html",
                    controller: 'AreaCtrl'
                }
            }
        })
        .state('app.retailer', {
            url: "/retailer/:id",
            views: {
                'menuContent': {
                    templateUrl: "templates/retailer.html",
                    controller: 'RetailerCtrl'
                }
            }
        })
        .state('app.dealer', {
            url: "/dealer/:id/:cid",
            views: {
                'menuContent': {
                    templateUrl: "templates/dealer.html",
                    controller: 'DealerCtrl'
                }
            }
        })
        .state('app.confirm-order', {
            url: "/confirm-order/:id",
            views: {
                'menuContent': {
                    templateUrl: "templates/confirm-order.html",
                    controller: 'DealerCtrl'
                }
            }
        })
        .state('app.viewall', {
            url: "/viewall",
            views: {
                'menuContent': {
                    templateUrl: "templates/viewall.html",
                    controller: 'ViewallCtrl'
                }
            }
        })
        .state('app.orders', {
            url: "/orders",
            views: {
                'menuContent': {
                    templateUrl: "templates/orders.html",
                    controller: 'OrderCtrl'
                }
            }
        })
        .state('app.orderdetails', {
            url: "/orderdetails/:id",
            views: {
                'menuContent': {
                    templateUrl: "templates/orderdetails.html",
                    controller: 'OrderdetailCtrl'
                }
            }
        })
        .state('app.addshop', {
            url: "/addshop/:areaid",
            views: {
                'menuContent': {
                    templateUrl: "templates/addshop.html",
                    controller: 'AddshopCtrl'
                }
            }
        });
    // if none of the above states are matched, use this as the fallback
    $urlRouterProvider.otherwise('/app/home');
});


starter.filter('decimal2', function () {
    return function (input) {
        return parseFloat(input).toFixed(2);
    };
})

starter.filter('reverse', function () {
    return function (items) {
        return items.slice().reverse();
    };
});