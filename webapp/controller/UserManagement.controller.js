sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/ui/model/json/JSONModel"
], function (Controller, MessageToast, JSONModel) {
    "use strict";

    return Controller.extend("myapp.controller.UserManagement", {

        onInit: function () {
            var oUsersModel = this.getOwnerComponent().getModel("users");
            this.getView().setModel(oUsersModel, "users");
        },

        onNavBack: function () {
            this.getOwnerComponent().getRouter().navTo("RouteHome");
        },

        onSearch: function (oEvent) {
            var sValue = oEvent.getParameter("value");
            MessageToast.show("搜索用户: " + sValue);
        },

        onAddUser: function () {
            MessageToast.show("添加新用户功能");
        },

        onEditUser: function () {
            MessageToast.show("编辑用户功能");
        },

        onDeleteUser: function () {
            MessageToast.show("删除用户功能");
        }
    });
});
