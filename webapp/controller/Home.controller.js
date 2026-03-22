sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel"
], function (Controller, JSONModel) {
    "use strict";

    return Controller.extend("myapp.controller.Home", {
        onInit: function () {
            var oUserModel = this.getOwnerComponent().getModel("user");
            var oCurrentUser = oUserModel && oUserModel.getProperty("/currentUser");
            if (!oCurrentUser || !oCurrentUser.username) {
                this.getOwnerComponent().getRouter().navTo("RouteLogin", {}, true);
                return;
            }

            var oViewModel = new JSONModel({
                processMenuExpanded: false,
                processMenuSelectedKey: ""
            });
            this.getView().setModel(oViewModel, "view");

            this._initializeDashboardData();
        },

        onLogout: function () {
            var oUserModel = this.getOwnerComponent().getModel("user");
            if (oUserModel) {
                oUserModel.setProperty("/currentUser", null);
            }
            localStorage.removeItem("currentUser");
            this.getOwnerComponent().getRouter().navTo("RouteLogin", {}, true);
        },

        onNavigateToSuppliers: function () {
            this.getOwnerComponent().getRouter().navTo("RouteSupplierList");
        },

        onNavigateToMaterials: function () {
            this.getOwnerComponent().getRouter().navTo("RouteMaterialList");
        },

        onNavigateToPurchaseOrders: function () {
            this.getOwnerComponent().getRouter().navTo("RoutePurchaseOrderList");
        },

        onNavigateToDeliveryPlans: function () {
            this.getOwnerComponent().getRouter().navTo("RouteDeliveryPlanList");
        },

        onNavigateToInvoices: function () {
            this.getOwnerComponent().getRouter().navTo("RouteInvoiceList");
        },

        onNavigateToProfile: function () {
            this.getOwnerComponent().getRouter().navTo("RouteProfile");
        },

        onNavigateToUserManagement: function () {
            this.getOwnerComponent().getRouter().navTo("RouteUserManagement");
        },

        onNavigateToProcessManagement: function () {
            // 继续保留入口，兼容旧调用：仅展开流程管理一级菜单，不跳页面
            this.onToggleProcessMenu();
        },

        onNavigateToProcessCategories: function () {
            this.getOwnerComponent().getRouter().navTo("RouteProcessCategories");
            var oViewModel = this.getView().getModel("view");
            oViewModel.setProperty("/processMenuExpanded", true);
            oViewModel.setProperty("/processMenuSelectedKey", "categories");
        },

        onNavigateToProcessFormConfigs: function () {
            this.getOwnerComponent().getRouter().navTo("RouteProcessFormConfigs");
            var oViewModel = this.getView().getModel("view");
            oViewModel.setProperty("/processMenuExpanded", true);
            oViewModel.setProperty("/processMenuSelectedKey", "forms");
        },

        onNavigateToProcessModels: function () {
            this.getOwnerComponent().getRouter().navTo("RouteProcessModels");
            var oViewModel = this.getView().getModel("view");
            oViewModel.setProperty("/processMenuExpanded", true);
            oViewModel.setProperty("/processMenuSelectedKey", "models");
        },

        onNavigateToProcessDeployments: function () {
            this.getOwnerComponent().getRouter().navTo("RouteProcessDeployments");
            var oViewModel = this.getView().getModel("view");
            oViewModel.setProperty("/processMenuExpanded", true);
            oViewModel.setProperty("/processMenuSelectedKey", "deployment");
        },

        onToggleProcessMenu: function () {
            var oViewModel = this.getView().getModel("view");
            var bExpanded = oViewModel.getProperty("/processMenuExpanded");

            // 仅控制展开/收起，不产生路由跳转（避免子页面强制跳转）。
            if (!bExpanded && !oViewModel.getProperty("/processMenuSelectedKey")) {
                oViewModel.setProperty("/processMenuSelectedKey", "categories");
            }

            oViewModel.setProperty("/processMenuExpanded", !bExpanded);
        },

        onNavigateToSystemManagement: function () {
            this.getOwnerComponent().getRouter().navTo("RouteSystemManagement");
        },

        _initializeDashboardData: function () {
            var oDashboardModel = this.getOwnerComponent().getModel("dashboard");
            this.getView().setModel(oDashboardModel, "dashboard");
        }
    });
});