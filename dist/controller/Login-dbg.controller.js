sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/ui/model/json/JSONModel"
], function (Controller, MessageToast, JSONModel) {
    "use strict";

    return Controller.extend("myapp.controller.Login", {

        onInit: function () {
            this.getView().setModel(new JSONModel({
                username: "admin",
                password: "admin",
                rememberMe: false
            }));

            var sLangParam = new URLSearchParams(window.location.search).get("sap-language");
            var sSavedLang = localStorage.getItem("app-language");
            var sCurrentLang = ((sLangParam || sSavedLang || "ZH").toUpperCase().startsWith("EN")) ? "EN" : "ZH";
            this.getView().setModel(new JSONModel({ currentLang: sCurrentLang }), "view");
        },

        onLanguageToggle: function (oEvent) {
            var sKey = oEvent.getParameter("item").getKey();
            localStorage.setItem("app-language", sKey);
            var oUrl = new URL(window.location.href);
            oUrl.searchParams.set("sap-language", sKey);
            window.location.replace(oUrl.toString());
        },

        onLogin: function () {
            var sUsername = (this.getView().getModel().getProperty("/username") || "").toString().trim();
            var sPassword = (this.getView().getModel().getProperty("/password") || "").toString().trim();

            if (!sUsername || !sPassword) {
                MessageToast.show(this._getText("loginRequired"));
                return;
            }

            MessageToast.show(this._getText("loggingIn"));
            var oView = this.getView();
            var oUserModel = this.getOwnerComponent().getModel("user");

            // 先尝试后端校验，失败回退本地模型
            fetch("/api/auth/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ username: sUsername, password: sPassword })
            })
            .then(function (res) {
                if (!res.ok) {
                    throw new Error("后端登录接口返回错误：" + res.status + " " + res.statusText);
                }
                return res.json();
            })
            .then(function (data) {
                if (data && data.success) {
                    // 成功：后端返回用户信息（建议仅返回 id/name/token）
                    var sToken = data.token || "";
                    var iExpiry = Date.now() + 30 * 60 * 1000; // 30 分钟有效期
                    var oCurrentUser = {
                        username: data.user.username,
                        name: data.user.name || data.user.username,
                        token: sToken,
                        tokenExpiry: iExpiry
                    };
                    if (!oUserModel) {
                        oUserModel = new JSONModel({ users: [], currentUser: oCurrentUser });
                        this.getOwnerComponent().setModel(oUserModel, "user");
                    } else {
                        oUserModel.setProperty("/currentUser", oCurrentUser);
                    }
                    localStorage.setItem("currentUser", JSON.stringify(oCurrentUser));
                    oView.getModel().setProperty("/password", "");
                    this._navToHome();
                } else {
                    MessageToast.show(data.message || this._getText("loginFailed"));
                    oView.getModel().setProperty("/password", "");
                }
            }.bind(this))
            .catch(function (err) {
                console.warn("后端登录失败，使用本地校验：", err);
                // 没有后端环境时兜底本地校验
                if (!oUserModel) {
                    oUserModel = new JSONModel({
                        users: [{ username: "admin", password: "admin", name: "Administrator" }],
                        currentUser: null
                    });
                    this.getOwnerComponent().setModel(oUserModel, "user");
                }

                var aUsers = oUserModel.getProperty("/users") || [];
                if (!aUsers.length) {
                    aUsers = [{ username: "admin", password: "admin", name: "Administrator" }];
                    oUserModel.setProperty("/users", aUsers);
                }

                var oUser = aUsers.find(function(user) {
                    return user.username === sUsername;
                });

                if (!oUser) {
                    MessageToast.show(this._getText("usernameNotFound"));
                } else if (oUser.password !== sPassword) {
                    MessageToast.show(this._getText("passwordIncorrect"));
                } else {
                    var oLocalUser = Object.assign({}, oUser, {
                        token: "local-token-" + Math.random().toString(36).slice(2),
                        tokenExpiry: Date.now() + 30 * 60 * 1000 // 30 分钟
                    });
                    oUserModel.setProperty("/currentUser", oLocalUser);
                    localStorage.setItem("currentUser", JSON.stringify(oLocalUser));
                    oView.getModel().setProperty("/password", "");
                    this._navToHome();
                    return;
                }
                oView.getModel().setProperty("/password", "");
            }.bind(this));
        },

        _navToHome: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteHome", {}, true);
            setTimeout(function () {
                if (window.location.hash !== "#/home") {
                    window.location.hash = "#/home";
                }
            }, 100);
        },

        onRegister: function () {
            var sUsername = this.getView().getModel().getProperty("/username");
            var sPassword = this.getView().getModel().getProperty("/password");
            var oUserModel = this.getOwnerComponent().getModel("user");
            var aUsers = oUserModel.getProperty("/users");

            // Check if username already exists
            var existingUser = aUsers.find(function(user) {
                return user.username === sUsername;
            });

            if (existingUser) {
                MessageToast.show(this._getText("usernameExists"));
                return;
            }

            if (sUsername && sPassword) {
                aUsers.push({ username: sUsername, password: sPassword, name: sUsername });
                oUserModel.setProperty("/users", aUsers);
                var oRegisteredUser = {
                    username: sUsername,
                    password: sPassword,
                    name: sUsername,
                    token: "local-token-" + Math.random().toString(36).slice(2),
                    tokenExpiry: Date.now() + 30 * 60 * 1000
                };
                oUserModel.setProperty("/currentUser", oRegisteredUser);
                localStorage.setItem("currentUser", JSON.stringify(oRegisteredUser));
                this.getView().getModel().setProperty("/password", "");
                this.getOwnerComponent().getRouter().navTo("RouteHome", {}, true);
                MessageToast.show(this._getText("registerSuccess"));
            } else {
                MessageToast.show(this._getText("loginRequired"));
            }
        },

        _getText: function (sKey) {
            return this.getOwnerComponent().getModel("i18n").getResourceBundle().getText(sKey);
        }
    });
});