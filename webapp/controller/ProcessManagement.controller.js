sap.ui.define([
    "sap/ui/core/mvc/Controller"
], function (Controller) {
    "use strict";

    return Controller.extend("myapp.controller.ProcessManagement", {
        onInit: function () {
            var oModel = this.getOwnerComponent().getModel("process");
            if (oModel) {
                this.getView().setModel(oModel, "process");
            }

            var oRouter = this.getOwnerComponent().getRouter();
            ["RouteProcessManagement", "RouteProcessCategories", "RouteProcessFormConfigs", "RouteProcessModels", "RouteProcessDeployments"].forEach(function (sRouteName) {
                oRouter.getRoute(sRouteName).attachPatternMatched(this._onRouteMatched, this);
            }, this);
        },

        _onRouteMatched: function (oEvent) {
            var sRouteName = oEvent.getParameter("name");
            var sKey = "categories";

            switch (sRouteName) {
                case "RouteProcessCategories":
                    sKey = "categories";
                    break;
                case "RouteProcessFormConfigs":
                    sKey = "forms";
                    break;
                case "RouteProcessModels":
                    sKey = "models";
                    break;
                case "RouteProcessDeployments":
                    sKey = "deployment";
                    break;
                default:
                    sKey = "categories";
            }

            var oTabContainer = this.byId("processTabContainer");
            if (oTabContainer) {
                oTabContainer.setSelectedKey(sKey);
            }
        },

        onNavBack: function () {
            this.getOwnerComponent().getRouter().navTo("RouteHome");
        }
    });
});