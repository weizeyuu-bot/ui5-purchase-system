sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox"
], function (Controller, JSONModel, MessageToast, MessageBox) {
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

        onEditUser: function () {
            var oUser = this.getView().getModel("userDetail").getData();
            MessageToast.show("编辑用户: " + oUser.username + " 功能开发中");
        },

        onNavBack: function () {
            this.getOwnerComponent().getRouter().navTo("RouteUserManagement");
        }
    });
});