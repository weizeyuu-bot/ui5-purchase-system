sap.ui.define([
    "sap/ui/core/UIComponent",
    "sap/ui/Device",
    "sap/ui/core/routing/HashChanger",
    "sap/m/MessageToast",
    "myapp/model/models"
], function (UIComponent, Device, HashChanger, MessageToast, models) {
    "use strict";

    return UIComponent.extend("myapp.Component", {
        metadata: { manifest: "json" },

        init: function () {
            UIComponent.prototype.init.apply(this, arguments);

            this._iSessionTimeoutMs = 30 * 60 * 1000;
            this._iActivityWriteThrottleMs = 10 * 1000;
            this._iLastActivityWriteAt = 0;
            this._aSessionEvents = ["click", "keydown", "touchstart", "mousemove", "scroll"];
            this._fnOnUserActivity = this._onUserActivity.bind(this);

            this.setModel(models.createDeviceModel(), "device");
            this.setModel(models.createSupplierModel(), "suppliers");
            this.setModel(models.createMaterialModel(), "materials");
            this.setModel(models.createPriceLibraryModel(), "priceLibrary");
            this.setModel(models.createPurchaseOrderModel(), "purchaseOrders");
            this.setModel(models.createDeliveryPlanModel(), "deliveryPlans");
            this.setModel(models.createInvoiceModel(), "invoices");
            this.setModel(models.createDashboardModel(), "dashboard");
            this.setModel(models.createProcessManagementModel(), "process");
            this.setModel(models.createUserManagementModel(), "users");
            this.setModel(models.createSystemManagementModel(), "system");

            models.syncPurchaseOrderPricing(
                this.getModel("purchaseOrders"),
                this.getModel("priceLibrary"),
                this.getModel("suppliers"),
                this.getModel("materials")
            );

            var oUserModel = models.createUserModel();
            this.setModel(oUserModel, "user");
            this._normalizeSessionState();
            this._attachSessionActivityListeners();

            var oRouter = this.getRouter();
            oRouter.attachBeforeRouteMatched(this._onBeforeRouteMatched, this);
            this._syncInitialHashWithSession();
            oRouter.initialize();
        },

        exit: function () {
            this._detachSessionActivityListeners();
        },

        _normalizeSessionState: function () {
            var oUserModel = this.getModel("user");
            var oCurrentUser = oUserModel && oUserModel.getProperty("/currentUser");

            if (!oCurrentUser || !oCurrentUser.username || !oCurrentUser.token) {
                return;
            }

            if (!oCurrentUser.tokenExpiry) {
                oCurrentUser.tokenExpiry = Date.now() + this._iSessionTimeoutMs;
                oCurrentUser.lastActivityAt = Date.now();
                oUserModel.setProperty("/currentUser", oCurrentUser);
                localStorage.setItem("currentUser", JSON.stringify(oCurrentUser));
            }
        },

        _syncInitialHashWithSession: function () {
            var sHash = HashChanger.getInstance().getHash() || "";
            var oUserModel = this.getModel("user");
            var oCurrentUser = oUserModel && oUserModel.getProperty("/currentUser");

            if (this._isUserValid(oCurrentUser)) {
                if (!sHash || sHash === "login") {
                    HashChanger.getInstance().replaceHash("home");
                }
                return;
            }

            if (sHash !== "login") {
                HashChanger.getInstance().replaceHash("login");
            }
        },

        _onBeforeRouteMatched: function (oEvent) {
            var oUserModel = this.getModel("user");
            var oCurrentUser = oUserModel && oUserModel.getProperty("/currentUser");
            var sRoute = oEvent.getParameter("name");

            var bUserIsValid = this._isUserValid(oCurrentUser);
            if (!bUserIsValid) {
                this._clearCurrentUser();
                oEvent.preventDefault();
                this.getRouter().navTo("RouteLogin", {}, true);
                return;
            }

            this._touchSession(false);

            if (sRoute === "RouteApp" || sRoute === "RouteLogin") {
                oEvent.preventDefault();
                this.getRouter().navTo("RouteHome", {}, true);
            }
        },

        _attachSessionActivityListeners: function () {
            var that = this;
            this._aSessionEvents.forEach(function (sEventName) {
                window.addEventListener(sEventName, that._fnOnUserActivity, true);
            });
        },

        _detachSessionActivityListeners: function () {
            var that = this;
            if (!this._fnOnUserActivity || !this._aSessionEvents) {
                return;
            }
            this._aSessionEvents.forEach(function (sEventName) {
                window.removeEventListener(sEventName, that._fnOnUserActivity, true);
            });
        },

        _onUserActivity: function () {
            var oUserModel = this.getModel("user");
            var oCurrentUser = oUserModel && oUserModel.getProperty("/currentUser");
            if (!oCurrentUser) {
                return;
            }

            if (!this._isUserValid(oCurrentUser)) {
                this._clearCurrentUser();
                MessageToast.show("登录已过期，请重新登录");
                this.getRouter().navTo("RouteLogin", {}, true);
                return;
            }

            this._touchSession(true);
        },

        _touchSession: function (bThrottleWrite) {
            var oUserModel = this.getModel("user");
            var oCurrentUser = oUserModel && oUserModel.getProperty("/currentUser");
            if (!oCurrentUser) {
                return;
            }

            var iNow = Date.now();
            if (bThrottleWrite && this._iLastActivityWriteAt && iNow - this._iLastActivityWriteAt < this._iActivityWriteThrottleMs) {
                return;
            }

            oCurrentUser.lastActivityAt = iNow;
            oCurrentUser.tokenExpiry = iNow + this._iSessionTimeoutMs;
            oUserModel.setProperty("/currentUser", oCurrentUser);
            localStorage.setItem("currentUser", JSON.stringify(oCurrentUser));
            this._iLastActivityWriteAt = iNow;
        },

        _clearCurrentUser: function () {
            var oUserModel = this.getModel("user");
            if (oUserModel) {
                oUserModel.setProperty("/currentUser", null);
            }
            localStorage.removeItem("currentUser");
        },

        _isUserValid: function (oCurrentUser) {
            if (!oCurrentUser || !oCurrentUser.username || !oCurrentUser.token) {
                return false;
            }
            if (oCurrentUser.tokenExpiry && Number(oCurrentUser.tokenExpiry) < Date.now()) {
                return false;
            }
            return true;
        },

        _refreshToken: function () {
            var oUserModel = this.getModel("user");
            var oCurrentUser = oUserModel && oUserModel.getProperty("/currentUser");
            if (!oCurrentUser || !oCurrentUser.token) {
                return Promise.resolve(false);
            }

            // 后端刷新令牌接口（可选，若无后端则不启用）
            return fetch("/api/auth/refresh", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": "Bearer " + oCurrentUser.token
                },
                body: JSON.stringify({ username: oCurrentUser.username })
            })
            .then(function (res) {
                if (!res.ok) {
                    throw new Error("刷新 token 失败");
                }
                return res.json();
            })
            .then(function (data) {
                if (data && data.success && data.token) {
                    oCurrentUser.token = data.token;
                    oCurrentUser.tokenExpiry = Date.now() + 30 * 60 * 1000;
                    oUserModel.setProperty("/currentUser", oCurrentUser);
                    localStorage.setItem("currentUser", JSON.stringify(oCurrentUser));
                    return true;
                }
                return false;
            })
            .catch(function () {
                return false;
            });
        }
    });
});