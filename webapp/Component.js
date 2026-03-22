sap.ui.define([
    "sap/ui/core/UIComponent",
    "sap/ui/Device",
    "myapp/model/models"
], function (UIComponent, Device, models) {
    "use strict";

    return UIComponent.extend("myapp.Component", {
        metadata: { manifest: "json" },

        init: function () {
            UIComponent.prototype.init.apply(this, arguments);

            this.setModel(models.createDeviceModel(), "device");
            this.setModel(models.createSupplierModel(), "suppliers");
            this.setModel(models.createMaterialModel(), "materials");
            this.setModel(models.createPurchaseOrderModel(), "purchaseOrders");
            this.setModel(models.createDeliveryPlanModel(), "deliveryPlans");
            this.setModel(models.createInvoiceModel(), "invoices");
            this.setModel(models.createDashboardModel(), "dashboard");
            this.setModel(models.createProcessManagementModel(), "process");
            this.setModel(models.createUserManagementModel(), "users");
            this.setModel(models.createSystemManagementModel(), "system");

            var oUserModel = models.createUserModel();
            this.setModel(oUserModel, "user");

            var oRouter = this.getRouter();
            oRouter.attachBeforeRouteMatched(this._onBeforeRouteMatched, this);
            oRouter.initialize();
        },

        _onBeforeRouteMatched: function (oEvent) {
            var oUserModel = this.getModel("user");
            var oCurrentUser = oUserModel && oUserModel.getProperty("/currentUser");
            var sRoute = oEvent.getParameter("name");

            var bUserIsValid = this._isUserValid(oCurrentUser);
            if (!bUserIsValid) {
                if (oUserModel) {
                    oUserModel.setProperty("/currentUser", null);
                }
                localStorage.removeItem("currentUser");
                oEvent.preventDefault();
                this.getRouter().navTo("RouteLogin", {}, true);
                return;
            }

            if (sRoute === "RouteApp" || sRoute === "RouteLogin") {
                oEvent.preventDefault();
                this.getRouter().navTo("RouteHome", {}, true);
            }
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