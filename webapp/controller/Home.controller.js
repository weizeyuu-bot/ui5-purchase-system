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

            var sLangParam = new URLSearchParams(window.location.search).get("sap-language");
            var sSavedLang = localStorage.getItem("app-language");
            var sCurrentLang = ((sLangParam || sSavedLang || "ZH").toUpperCase().startsWith("EN")) ? "EN" : "ZH";

            this.getView().setModel(new JSONModel({
                activeMenuKey: "",
                processMenuExpanded: false,
                processMenuSelectedKey: "",
                currentLang: sCurrentLang,
                menuVisibility: {
                    suppliers: true,
                    materials: true,
                    priceLibrary: true,
                    quoteManagement: true,
                    purchaseOrders: true,
                    deliveryPlans: true,
                    invoices: true,
                    profile: true,
                    users: true,
                    roles: true,
                    permissionManagement: true,
                    processManagement: true,
                    system: true,
                    masterDataGroup: true,
                    operationsGroup: true,
                    governanceGroup: true
                }
            }), "view");

            this._oDashboardModel = new JSONModel({
                welcomeTitle: "",
                welcomeSubtitle: "",
                todayText: "",
                focusText: "",
                summaryCards: [],
                todoCards: [],
                alerts: [],
                quickActions: [],
                statusOverview: [],
                deliveryStatus: [],
                invoiceStatus: [],
                topSuppliers: [],
                activities: []
            });
            this.getView().setModel(this._oDashboardModel, "dashboard");

            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.getRoute("RouteHome").attachPatternMatched(this._onHomeMatched, this);

            this._applyMenuAuthorization();
            this._refreshDashboard();
        },

        _onHomeMatched: function () {
            this._applyMenuAuthorization();
            this._refreshDashboard();
        },

        onLanguageToggle: function (oEvent) {
            var sKey = oEvent.getParameter("item").getKey();
            localStorage.setItem("app-language", sKey);
            var oUrl = new URL(window.location.href);
            oUrl.searchParams.set("sap-language", sKey);
            window.location.replace(oUrl.toString());
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
            this._setActiveMenuKey("suppliers");
            this.getOwnerComponent().getRouter().navTo("RouteSupplierList");
        },

        onNavigateToMaterials: function () {
            this._setActiveMenuKey("materials");
            this.getOwnerComponent().getRouter().navTo("RouteMaterialList");
        },

        onNavigateToPurchaseOrders: function () {
            this._setActiveMenuKey("purchaseOrders");
            this.getOwnerComponent().getRouter().navTo("RoutePurchaseOrderList");
        },

        onNavigateToDeliveryPlans: function () {
            this._setActiveMenuKey("deliveryPlans");
            this.getOwnerComponent().getRouter().navTo("RouteDeliveryPlanList");
        },

        onNavigateToInvoices: function () {
            this._setActiveMenuKey("invoices");
            this.getOwnerComponent().getRouter().navTo("RouteInvoiceList");
        },

        onNavigateToProfile: function () {
            this._setActiveMenuKey("profile");
            this.getOwnerComponent().getRouter().navTo("RouteProfile");
        },

        onNavigateToUserManagement: function () {
            this._setActiveMenuKey("users");
            this.getOwnerComponent().getRouter().navTo("RouteUserManagementTab", { tab: "users" });
        },

        onNavigateToRoleManagement: function () {
            this._setActiveMenuKey("roles");
            this.getOwnerComponent().getRouter().navTo("RouteUserManagementTab", { tab: "roles" });
        },

        onNavigateToPermissionManagement: function () {
            this._setActiveMenuKey("permissionManagement");
            this.getOwnerComponent().getRouter().navTo("RouteUserManagementTab", { tab: "permissions" });
        },

        onNavigateToQuoteManagement: function () {
            this._setActiveMenuKey("quoteManagement");
            this.getOwnerComponent().getRouter().navTo("RouteQuoteManagement");
        },

        onNavigateToPriceLibrary: function () {
            this._setActiveMenuKey("priceLibrary");
            this.getOwnerComponent().getRouter().navTo("RoutePriceLibrary");
        },

        onNavigateToProcessManagement: function () {
            this.onToggleProcessMenu();
        },

        onNavigateToProcessCategories: function () {
            this._setActiveMenuKey("processCategories");
            this.getOwnerComponent().getRouter().navTo("RouteProcessCategories");
            var oViewModel = this.getView().getModel("view");
            oViewModel.setProperty("/processMenuExpanded", true);
            oViewModel.setProperty("/processMenuSelectedKey", "categories");
        },

        onNavigateToProcessFormConfigs: function () {
            this._setActiveMenuKey("processForms");
            this.getOwnerComponent().getRouter().navTo("RouteProcessFormConfigs");
            var oViewModel = this.getView().getModel("view");
            oViewModel.setProperty("/processMenuExpanded", true);
            oViewModel.setProperty("/processMenuSelectedKey", "forms");
        },

        onNavigateToProcessModels: function () {
            this._setActiveMenuKey("processModels");
            this.getOwnerComponent().getRouter().navTo("RouteProcessModels");
            var oViewModel = this.getView().getModel("view");
            oViewModel.setProperty("/processMenuExpanded", true);
            oViewModel.setProperty("/processMenuSelectedKey", "models");
        },

        onNavigateToProcessDeployments: function () {
            this._setActiveMenuKey("processDeployments");
            this.getOwnerComponent().getRouter().navTo("RouteProcessDeployments");
            var oViewModel = this.getView().getModel("view");
            oViewModel.setProperty("/processMenuExpanded", true);
            oViewModel.setProperty("/processMenuSelectedKey", "deployment");
        },

        onToggleProcessMenu: function () {
            var oViewModel = this.getView().getModel("view");
            var bExpanded = oViewModel.getProperty("/processMenuExpanded");

            if (!bExpanded && !oViewModel.getProperty("/processMenuSelectedKey")) {
                oViewModel.setProperty("/processMenuSelectedKey", "categories");
            }

            oViewModel.setProperty("/processMenuExpanded", !bExpanded);
        },

        onNavigateToSystemManagement: function () {
            this._setActiveMenuKey("system");
            this.getOwnerComponent().getRouter().navTo("RouteSystemManagement");
        },

        _setActiveMenuKey: function (sKey) {
            this.getView().getModel("view").setProperty("/activeMenuKey", sKey || "");
        },

        _applyMenuAuthorization: function () {
            var oViewModel = this.getView().getModel("view");
            var oUserModel = this.getOwnerComponent().getModel("user");
            var oUsersModel = this.getOwnerComponent().getModel("users");
            var oCurrentUser = oUserModel && oUserModel.getProperty("/currentUser");
            var aRegisteredUsers = oUsersModel.getProperty("/registeredUsers") || [];
            var aRoles = oUsersModel.getProperty("/roles") || [];
            var oRegisteredUser = aRegisteredUsers.find(function (oItem) {
                return oCurrentUser && oItem.username === oCurrentUser.username;
            });
            var oRole = aRoles.find(function (oItem) {
                return oRegisteredUser && oItem.id === oRegisteredUser.roleId;
            });
            var oPermissions = oRole && oRole.permissions ? oRole.permissions : {};
            var fnCanQuery = function (sModule) {
                return !!(oPermissions[sModule] && oPermissions[sModule].query);
            };
            var oVisibility = {
                suppliers: fnCanQuery("suppliers"),
                materials: fnCanQuery("materials"),
                priceLibrary: fnCanQuery("priceLibrary"),
                quoteManagement: fnCanQuery("quoteManagement"),
                purchaseOrders: fnCanQuery("purchaseOrders"),
                deliveryPlans: fnCanQuery("deliveryPlans"),
                invoices: fnCanQuery("invoices"),
                profile: true,
                users: fnCanQuery("users"),
                roles: fnCanQuery("roles"),
                permissionManagement: fnCanQuery("permissionManagement"),
                processManagement: fnCanQuery("processManagement"),
                system: fnCanQuery("system")
            };

            oVisibility.masterDataGroup = oVisibility.suppliers || oVisibility.materials || oVisibility.priceLibrary || oVisibility.quoteManagement;
            oVisibility.operationsGroup = oVisibility.purchaseOrders || oVisibility.deliveryPlans || oVisibility.invoices;
            oVisibility.governanceGroup = oVisibility.profile || oVisibility.users || oVisibility.roles || oVisibility.permissionManagement || oVisibility.processManagement || oVisibility.system;

            oViewModel.setProperty("/menuVisibility", oVisibility);
        },

        onDashboardRoutePress: function (oEvent) {
            var oContext = oEvent.getSource().getBindingContext("dashboard");
            var oItem = oContext && oContext.getObject();

            if (!oItem || !oItem.route) {
                return;
            }

            this.getOwnerComponent().getRouter().navTo(oItem.route, oItem.params || {});
        },

        onAlertPress: function (oEvent) {
            this.onDashboardRoutePress(oEvent);
        },

        _refreshDashboard: function () {
            var oBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
            var oUserModel = this.getOwnerComponent().getModel("user");
            var oCurrentUser = oUserModel && oUserModel.getProperty("/currentUser");
            var aSuppliers = this.getOwnerComponent().getModel("suppliers").getProperty("/suppliers") || [];
            var aMaterials = this.getOwnerComponent().getModel("materials").getProperty("/materials") || [];
            var aOrders = this.getOwnerComponent().getModel("purchaseOrders").getProperty("/purchaseOrders") || [];
            var aDeliveries = this.getOwnerComponent().getModel("deliveryPlans").getProperty("/deliveryPlans") || [];
            var aInvoices = this.getOwnerComponent().getModel("invoices").getProperty("/invoices") || [];
            var aPrices = this.getOwnerComponent().getModel("priceLibrary").getProperty("/priceRecords") || [];
            var aUsers = this.getOwnerComponent().getModel("users").getProperty("/registeredUsers") || [];

            var iPendingOrders = aOrders.filter(function (oOrder) {
                return oOrder.status === "ORDERED" || oOrder.status === "PROCESSING";
            }).length;
            var iPendingDeliveries = aDeliveries.filter(function (oPlan) {
                return oPlan.status === "PENDING" || oPlan.status === "IN_TRANSIT";
            }).length;
            var iPendingInvoices = aInvoices.filter(function (oInvoice) {
                return oInvoice.status === "PENDING";
            }).length;
            var iLowStock = aMaterials.filter(function (oMaterial) {
                return Number(oMaterial.stock || 0) <= 100;
            }).length;
            var aExpiringPrices = this._getExpiringPrices(aPrices, 7);
            var iActivePrices = aPrices.filter(function (oPrice) {
                return this._getPriceStatus(oPrice.validFrom, oPrice.validTo) === "Success";
            }, this).length;
            var fTotalAmount = aOrders.reduce(function (fSum, oOrder) {
                return fSum + Number(oOrder.amount || 0);
            }, 0);

            this._oDashboardModel.setData({
                welcomeTitle: oBundle.getText("homeWelcomeTitle"),
                welcomeSubtitle: oBundle.getText("homeWelcomeSubtitle", [((oCurrentUser && (oCurrentUser.name || oCurrentUser.username)) || oBundle.getText("defaultUserName"))]),
                todayText: this._formatTodayText(),
                focusText: oBundle.getText("homeFocusText", [iPendingOrders, aExpiringPrices.length, iLowStock]),
                summaryCards: [
                    {
                        title: oBundle.getText("homeCardSupplierPoolTitle"),
                        value: String(aSuppliers.length),
                        description: oBundle.getText("homeCardSupplierPoolDesc", [aUsers.length]),
                        icon: "sap-icon://supplier",
                        route: "RouteSupplierList"
                    },
                    {
                        title: oBundle.getText("homeCardMaterialCoverageTitle"),
                        value: String(aMaterials.length),
                        description: oBundle.getText("homeCardMaterialCoverageDesc", [iLowStock]),
                        icon: "sap-icon://product",
                        route: "RouteMaterialList"
                    },
                    {
                        title: oBundle.getText("homeCardProcurementRunningTitle"),
                        value: String(iPendingOrders),
                        description: oBundle.getText("homeCardProcurementRunningDesc", [this._formatCurrency(fTotalAmount)]),
                        icon: "sap-icon://shipping-status",
                        route: "RoutePurchaseOrderList"
                    },
                    {
                        title: oBundle.getText("homeCardActivePriceTitle"),
                        value: String(iActivePrices),
                        description: oBundle.getText("homeCardActivePriceDesc", [aExpiringPrices.length]),
                        icon: "sap-icon://money-bills",
                        route: "RoutePriceLibrary"
                    }
                ],
                todoCards: [
                    {
                        title: oBundle.getText("homeTodoPendingOrdersTitle"),
                        value: String(iPendingOrders),
                        subtitle: oBundle.getText("homeTodoPendingOrdersSubtitle"),
                        statusText: iPendingOrders > 0 ? oBundle.getText("homeTodoNeedHandle") : oBundle.getText("homeTodoCleared"),
                        statusState: iPendingOrders > 0 ? "Warning" : "Success",
                        route: "RoutePurchaseOrderList"
                    },
                    {
                        title: oBundle.getText("homeTodoDeliveryTitle"),
                        value: String(iPendingDeliveries),
                        subtitle: oBundle.getText("homeTodoDeliverySubtitle"),
                        statusText: iPendingDeliveries > 0 ? oBundle.getText("homeTodoToAdvance") : oBundle.getText("homeTodoStable"),
                        statusState: iPendingDeliveries > 0 ? "Information" : "Success",
                        route: "RouteDeliveryPlanList"
                    },
                    {
                        title: oBundle.getText("homeTodoInvoiceTitle"),
                        value: String(iPendingInvoices),
                        subtitle: oBundle.getText("homeTodoInvoiceSubtitle"),
                        statusText: iPendingInvoices > 0 ? oBundle.getText("homeTodoPending") : oBundle.getText("homeTodoSynced"),
                        statusState: iPendingInvoices > 0 ? "Warning" : "Success",
                        route: "RouteInvoiceList"
                    },
                    {
                        title: oBundle.getText("homeTodoPriceExpiryTitle"),
                        value: String(aExpiringPrices.length),
                        subtitle: oBundle.getText("homeTodoPriceExpirySubtitle"),
                        statusText: aExpiringPrices.length > 0 ? oBundle.getText("homeTodoNeedMaintain") : oBundle.getText("homeTodoStatusStable"),
                        statusState: aExpiringPrices.length > 0 ? "Error" : "Success",
                        route: "RoutePriceLibrary"
                    }
                ],
                alerts: this._buildAlerts(aExpiringPrices, aMaterials, iPendingInvoices, iPendingOrders),
                quickActions: [
                    { title: oBundle.getText("homeQuickActionPriceTitle"), description: oBundle.getText("homeQuickActionPriceDesc"), icon: "sap-icon://money-bills", route: "RoutePriceLibrary" },
                    { title: oBundle.getText("homeQuickActionOrderTitle"), description: oBundle.getText("homeQuickActionOrderDesc"), icon: "sap-icon://documents", route: "RoutePurchaseOrderList" },
                    { title: oBundle.getText("homeQuickActionQuoteTitle"), description: oBundle.getText("homeQuickActionQuoteDesc"), icon: "sap-icon://business-objects-experience", route: "RouteQuoteManagement" },
                    { title: oBundle.getText("homeQuickActionDeliveryTitle"), description: oBundle.getText("homeQuickActionDeliveryDesc"), icon: "sap-icon://shipping-status", route: "RouteDeliveryPlanList" },
                    { title: oBundle.getText("homeQuickActionMaterialTitle"), description: oBundle.getText("homeQuickActionMaterialDesc"), icon: "sap-icon://product", route: "RouteMaterialList" },
                    { title: oBundle.getText("homeQuickActionSupplierTitle"), description: oBundle.getText("homeQuickActionSupplierDesc"), icon: "sap-icon://supplier", route: "RouteSupplierList" }
                ],
                statusOverview: this._buildStatusOverview(aOrders),
                deliveryStatus: this._buildDeliveryStatus(aDeliveries),
                invoiceStatus: this._buildInvoiceStatus(aInvoices),
                topSuppliers: this._buildTopSuppliers(aOrders),
                activities: this._buildActivities(aExpiringPrices, iPendingOrders, iPendingInvoices, iLowStock)
            });
        },

        _buildAlerts: function (aExpiringPrices, aMaterials, iPendingInvoices, iPendingOrders) {
            var aAlerts = [];
            var aLowStockMaterials = aMaterials.filter(function (oMaterial) {
                return Number(oMaterial.stock || 0) <= 100;
            }).sort(function (a, b) {
                return Number(a.stock || 0) - Number(b.stock || 0);
            });

            aExpiringPrices.slice(0, 2).forEach(function (oPrice) {
                aAlerts.push({
                    title: this._getText("homeAlertPriceExpiringTitle"),
                    description: this._getText("homeAlertPriceExpiringDesc", [oPrice.supplierName, oPrice.materialName, oPrice.validTo]),
                    info: this._getText("homeAlertInfoPriceLibrary"),
                    state: "Warning",
                    icon: "sap-icon://alert",
                    route: "RoutePriceLibrary"
                });
            }, this);

            aLowStockMaterials.slice(0, 2).forEach(function (oMaterial) {
                aAlerts.push({
                    title: this._getText("homeAlertLowStockTitle"),
                    description: this._getText("homeAlertLowStockDesc", [oMaterial.name, oMaterial.stock, oMaterial.unit]),
                    info: this._getText("homeAlertInfoMaterial"),
                    state: "Error",
                    icon: "sap-icon://inventory",
                    route: "RouteMaterialList"
                });
            }, this);

            if (iPendingOrders > 0) {
                aAlerts.push({
                    title: this._getText("homeAlertOrderPendingTitle"),
                    description: this._getText("homeAlertOrderPendingDesc", [iPendingOrders]),
                    info: this._getText("homeAlertInfoPurchaseOrder"),
                    state: "Information",
                    icon: "sap-icon://pending",
                    route: "RoutePurchaseOrderList"
                });
            }

            if (iPendingInvoices > 0) {
                aAlerts.push({
                    title: this._getText("homeAlertInvoicePendingTitle"),
                    description: this._getText("homeAlertInvoicePendingDesc", [iPendingInvoices]),
                    info: this._getText("homeAlertInfoInvoice"),
                    state: "Warning",
                    icon: "sap-icon://receipt",
                    route: "RouteInvoiceList"
                });
            }

            if (!aAlerts.length) {
                aAlerts.push({
                    title: this._getText("homeAlertNoHighPriorityTitle"),
                    description: this._getText("homeAlertNoHighPriorityDesc"),
                    info: this._getText("homeAlertInfoWorkbench"),
                    state: "Success",
                    icon: "sap-icon://status-positive",
                    route: "RouteHome"
                });
            }

            return aAlerts;
        },

        _buildStatusOverview: function (aOrders) {
            var aStatuses = ["ORDERED", "PROCESSING", "RECEIVED", "CANCELLED"];
            var iTotal = aOrders.length || 1;
            var mStateMap = { ORDERED: "Information", PROCESSING: "Warning", RECEIVED: "Success", CANCELLED: "Error" };

            return aStatuses.map(function (sStatus) {
                var iCount = aOrders.filter(function (oOrder) {
                    return oOrder.status === sStatus;
                }).length;
                var iPercent = Math.round((iCount / iTotal) * 100);
                return {
                    label: this._mapOrderStatusToText(sStatus),
                    count: iCount,
                    percentage: iPercent,
                    state: mStateMap[sStatus] || "None",
                    description: this._getText("homeStatusOverviewDesc", [iPercent])
                };
            }, this);
        },

        _buildDeliveryStatus: function (aDeliveries) {
            var aStatuses = ["PENDING", "SHIPPED", "IN_TRANSIT", "DELIVERED"];
            var iTotal = aDeliveries.length || 1;
            var mStateMap = { PENDING: "None", SHIPPED: "Information", IN_TRANSIT: "Warning", DELIVERED: "Success" };
            var mLabelKey = { PENDING: "deliveryStatusPending", SHIPPED: "deliveryStatusShipped", IN_TRANSIT: "deliveryStatusInTransit", DELIVERED: "deliveryStatusDelivered" };

            return aStatuses.map(function (sStatus) {
                var iCount = aDeliveries.filter(function (oPlan) {
                    return oPlan.status === sStatus;
                }).length;
                var iPercent = Math.round((iCount / iTotal) * 100);
                return {
                    label: this._getText(mLabelKey[sStatus]),
                    count: iCount,
                    percentage: iPercent,
                    state: mStateMap[sStatus] || "None"
                };
            }, this);
        },

        _buildInvoiceStatus: function (aInvoices) {
            var aStatuses = ["PENDING", "INVOICED", "VOID"];
            var iTotal = aInvoices.length || 1;
            var mStateMap = { PENDING: "Warning", INVOICED: "Success", VOID: "Error" };
            var mLabelKey = { PENDING: "invoiceStatusPending", INVOICED: "invoiceStatusInvoiced", VOID: "invoiceStatusVoided" };

            return aStatuses.map(function (sStatus) {
                var iCount = aInvoices.filter(function (oInvoice) {
                    return oInvoice.status === sStatus;
                }).length;
                var iPercent = Math.round((iCount / iTotal) * 100);
                return {
                    label: this._getText(mLabelKey[sStatus]),
                    count: iCount,
                    percentage: iPercent,
                    state: mStateMap[sStatus] || "None"
                };
            }, this);
        },

        _mapOrderStatusToText: function (sStatus) {
            var mStatusKey = {
                ORDERED: "statusOrderPlaced",
                PROCESSING: "statusProcessing",
                RECEIVED: "statusReceived",
                CANCELLED: "statusCancelled"
            };
            return this._getText(mStatusKey[sStatus] || "status");
        },

        _buildTopSuppliers: function (aOrders) {
            var mSupplierMap = {};

            aOrders.forEach(function (oOrder) {
                var sName = oOrder.vendor || oOrder.supplierId || this._getText("unknownSupplier");
                if (!mSupplierMap[sName]) {
                    mSupplierMap[sName] = {
                        name: sName,
                        contacts: 0,
                        totalAmount: 0
                    };
                }

                mSupplierMap[sName].contacts += 1;
                mSupplierMap[sName].totalAmount += Number(oOrder.amount || 0);
            });

            return Object.keys(mSupplierMap).map(function (sKey) {
                var oItem = mSupplierMap[sKey];
                return {
                    name: oItem.name,
                    contacts: oItem.contacts,
                    value: this._formatCurrency(oItem.totalAmount),
                    status: oItem.contacts >= 2 ? this._getText("supplierStatusCore") : this._getText("supplierStatusWatch"),
                    state: oItem.contacts >= 2 ? "Success" : "Information"
                };
            }, this).sort(function (a, b) {
                return parseFloat(String(b.value).replace(/[¥,]/g, "")) - parseFloat(String(a.value).replace(/[¥,]/g, ""));
            }).slice(0, 5);
        },

        _buildActivities: function (aExpiringPrices, iPendingOrders, iPendingInvoices, iLowStock) {
            var aActivities = [];

            if (aExpiringPrices.length) {
                aActivities.push({
                    title: this._getText("homeActivityPriceMaintainTitle"),
                    description: this._getText("homeActivityPriceMaintainDesc", [aExpiringPrices.length]),
                    icon: "sap-icon://money-bills",
                    route: "RoutePriceLibrary"
                });
            }

            if (iPendingOrders) {
                aActivities.push({
                    title: this._getText("homeActivityOrderProgressTitle"),
                    description: this._getText("homeActivityOrderProgressDesc", [iPendingOrders]),
                    icon: "sap-icon://shipping-status",
                    route: "RoutePurchaseOrderList"
                });
            }

            if (iPendingInvoices) {
                aActivities.push({
                    title: this._getText("homeActivityInvoiceFollowupTitle"),
                    description: this._getText("homeActivityInvoiceFollowupDesc", [iPendingInvoices]),
                    icon: "sap-icon://receipt",
                    route: "RouteInvoiceList"
                });
            }

            if (iLowStock) {
                aActivities.push({
                    title: this._getText("homeActivityStockAlertTitle"),
                    description: this._getText("homeActivityStockAlertDesc", [iLowStock]),
                    icon: "sap-icon://alert",
                    route: "RouteMaterialList"
                });
            }

            if (!aActivities.length) {
                aActivities.push({
                    title: this._getText("homeActivityStableTitle"),
                    description: this._getText("homeActivityStableDesc"),
                    icon: "sap-icon://status-positive",
                    route: "RouteHome"
                });
            }

            return aActivities;
        },

        _getExpiringPrices: function (aPrices, iDays) {
            var oToday = new Date();
            var iToday = Date.parse(oToday.toISOString().slice(0, 10));
            var iDeadline = Date.parse(new Date(oToday.getTime() + iDays * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));

            return (aPrices || []).filter(function (oPrice) {
                var iValidTo = Date.parse(oPrice.validTo || "");
                return !Number.isNaN(iValidTo) && iValidTo >= iToday && iValidTo <= iDeadline;
            }).sort(function (a, b) {
                return Date.parse(a.validTo) - Date.parse(b.validTo);
            });
        },

        _getPriceStatus: function (sValidFrom, sValidTo) {
            var iToday = Date.parse(new Date().toISOString().slice(0, 10));
            var iValidFrom = Date.parse(sValidFrom || "");
            var iValidTo = Date.parse(sValidTo || "");

            if (Number.isNaN(iValidFrom) || Number.isNaN(iValidTo)) {
                return "None";
            }
            if (iToday < iValidFrom) {
                return "Information";
            }
            if (iToday > iValidTo) {
                return "Error";
            }
            return "Success";
        },

        _formatCurrency: function (fValue) {
            return "¥" + Number(fValue || 0).toLocaleString("zh-CN", {
                minimumFractionDigits: 0,
                maximumFractionDigits: 2
            });
        },

        _formatTodayText: function () {
            var aWeeks = [this._getText("weekSun"), this._getText("weekMon"), this._getText("weekTue"), this._getText("weekWed"), this._getText("weekThu"), this._getText("weekFri"), this._getText("weekSat")];
            var oNow = new Date();
            var sDate = oNow.getFullYear() + "-" + String(oNow.getMonth() + 1).padStart(2, "0") + "-" + String(oNow.getDate()).padStart(2, "0");
            return sDate + " " + aWeeks[oNow.getDay()];
        },

        _getText: function (sKey, aArgs) {
            return this.getOwnerComponent().getModel("i18n").getResourceBundle().getText(sKey, aArgs);
        }
    });
});