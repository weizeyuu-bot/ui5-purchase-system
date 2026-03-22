sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast"
], function (Controller, JSONModel, MessageToast) {
    "use strict";

    return Controller.extend("myapp.controller.UserDetail", {

        onInit: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.getRoute("RouteUserDetail").attachPatternMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: function (oEvent) {
            var sUsername = oEvent.getParameter("arguments").username;
            var oUsersModel = this.getOwnerComponent().getModel("users");
            var aUsers = oUsersModel.getProperty("/registeredUsers") || [];
            var oUser = aUsers.find(function (oItem) {
                return oItem.username === sUsername;
            });

            if (oUser) {
                var oDetailModel = new JSONModel(oUser);
                this.getView().setModel(oDetailModel, "userDetail");
            } else {
                MessageToast.show("未找到用户：" + sUsername);
                this.getOwnerComponent().getRouter().navTo("RouteUserManagement");
            }
        },

        onNavBack: function () {
            this.getOwnerComponent().getRouter().navTo("RouteUserManagement");
        }
    });
});