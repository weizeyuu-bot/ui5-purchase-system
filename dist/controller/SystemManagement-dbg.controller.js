sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/ui/model/json/JSONModel"
], function (Controller, MessageToast, JSONModel) {
    "use strict";

    return Controller.extend("myapp.controller.SystemManagement", {

        onInit: function () {
            var oSystemModel = this.getOwnerComponent().getModel("system");
            this.getView().setModel(oSystemModel, "system");
        },

        onNavBack: function () {
            this.getOwnerComponent().getRouter().navTo("RouteHome");
        },

        onLogLevelChange: function (oEvent) {
            var oComboBox = oEvent.getSource();
            var oSelectedItem = oComboBox.getSelectedItem();
            if (oSelectedItem) {
                var sLevel = oSelectedItem.getText();
                MessageToast.show("筛选日志等级: " + sLevel);
            }
        }
    });
});
