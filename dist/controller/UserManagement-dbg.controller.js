sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/m/Dialog",
    "sap/m/Button",
    "sap/m/Label",
    "sap/m/Input",
    "sap/m/Select",
    "sap/ui/core/Item",
    "sap/ui/layout/form/SimpleForm",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], function (
    Controller,
    MessageToast,
    MessageBox,
    Dialog,
    Button,
    Label,
    Input,
    Select,
    Item,
    SimpleForm,
    JSONModel,
    Filter,
    FilterOperator
) {
    "use strict";

    return Controller.extend("myapp.controller.UserManagement", {

        onInit: function () {
            var oUsersModel = this.getOwnerComponent().getModel("users");
            this.getView().setModel(oUsersModel, "users");
            this._oUserDialog = null;
        },

        onNavBack: function () {
            this.getOwnerComponent().getRouter().navTo("RouteHome");
        },

        onSearch: function (oEvent) {
            var sValue = (oEvent.getParameter("query") || oEvent.getParameter("newValue") || "").trim();
            var oTable = this.byId("usersTable");
            var oBinding = oTable && oTable.getBinding("items");
            if (!oBinding) {
                return;
            }

            if (!sValue) {
                oBinding.filter([]);
                return;
            }

            var aFilters = [
                new Filter("username", FilterOperator.Contains, sValue),
                new Filter("email", FilterOperator.Contains, sValue),
                new Filter("phone", FilterOperator.Contains, sValue),
                new Filter("department", FilterOperator.Contains, sValue),
                new Filter("role", FilterOperator.Contains, sValue)
            ];

            oBinding.filter(new Filter({ filters: aFilters, and: false }));
        },

        onAddUser: function () {
            this._openUserDialog("add");
        },

        onOpenUserDetail: function (oEvent) {
            var oContext = oEvent.getSource().getParent().getParent().getBindingContext("users");
            if (!oContext) {
                return;
            }
            var sUsername = oContext.getProperty("username");
            this.getOwnerComponent().getRouter().navTo("RouteUserDetail", {
                username: encodeURIComponent(sUsername)
            });
        },

        onEditUser: function (oEvent) {
            var oContext = oEvent.getSource().getParent().getParent().getBindingContext("users");
            if (!oContext) {
                return;
            }
            this._openUserDialog("edit", oContext.getObject());
        },

        onDeleteUser: function (oEvent) {
            var oContext = oEvent.getSource().getParent().getParent().getBindingContext("users");
            if (!oContext) {
                return;
            }

            var that = this;
            var oUser = oContext.getObject();
            MessageBox.confirm(this._getText("userDeleteConfirm", [oUser.username]), {
                onClose: function (sAction) {
                    if (sAction !== MessageBox.Action.OK) {
                        return;
                    }

                    var oUsersModel = that.getView().getModel("users");
                    var aUsers = oUsersModel.getProperty("/registeredUsers") || [];
                    var aNewUsers = aUsers.filter(function (oItem) {
                        return oItem.username !== oUser.username;
                    });

                    oUsersModel.setProperty("/registeredUsers", aNewUsers);
                    that._refreshUserStatistics();
                    MessageToast.show(that._getText("deleteSuccess"));
                }
            });
        },

        _openUserDialog: function (sMode, oUser) {
            var that = this;
            var bEditMode = sMode === "edit";
            var oDialogModel = new JSONModel({
                mode: sMode,
                username: bEditMode ? oUser.username : "",
                email: bEditMode ? (oUser.email || "") : "",
                phone: bEditMode ? (oUser.phone || "") : "",
                department: bEditMode ? (oUser.department || "") : "",
                role: bEditMode ? (oUser.role || "") : "",
                status: bEditMode ? (oUser.status || "") : ""
            });

            if (!this._oUserDialog) {
                this._oUserDialog = new Dialog({
                    title: that._getText("userInfoDialogTitle"),
                    contentWidth: "460px",
                    content: [
                        new SimpleForm({
                            editable: true,
                            layout: "ResponsiveGridLayout",
                            labelSpanL: 4,
                            labelSpanM: 4,
                            emptySpanL: 0,
                            emptySpanM: 0,
                            columnsL: 1,
                            columnsM: 1,
                            content: [
                                new Label({ text: that._getText("username") }),
                                new Input({
                                    value: "{dialog>/username}",
                                    editable: "{= ${dialog>/mode} === 'add' }"
                                }),
                                new Label({ text: that._getText("userEmail") }),
                                new Input({ value: "{dialog>/email}" }),
                                new Label({ text: that._getText("userPhone") }),
                                new Input({ value: "{dialog>/phone}" }),
                                new Label({ text: that._getText("department") }),
                                new Input({ value: "{dialog>/department}" }),
                                new Label({ text: that._getText("role") }),
                                new Input({ value: "{dialog>/role}" }),
                                new Label({ text: that._getText("status") }),
                                new Select({
                                    selectedKey: "{dialog>/status}",
                                    forceSelection: false,
                                    items: [{key: "", textKey: "pleaseSelect"}].concat(
                                        (that.getOwnerComponent().getModel("statusOptions").getProperty("/userStatus") || [])
                                    ).map(function (oOpt) {
                                        return new Item({ key: oOpt.key, text: that._getText(oOpt.textKey) });
                                    })
                                })
                            ]
                        })
                    ],
                    beginButton: new Button({
                        text: that._getText("saveButton"),
                        type: "Emphasized",
                        press: function () {
                            that._onSaveDialogUser();
                        }
                    }),
                    endButton: new Button({
                        text: that._getText("cancelButton"),
                        press: function () {
                            that._oUserDialog.close();
                        }
                    })
                });

                this.getView().addDependent(this._oUserDialog);
            }

            this._oUserDialog.setModel(oDialogModel, "dialog");
            this._oUserDialog.open();
        },

        _onSaveDialogUser: function () {
            var oDialogModel = this._oUserDialog.getModel("dialog");
            var oData = Object.assign({}, oDialogModel.getData());
            var oUsersModel = this.getView().getModel("users");
            var aUsers = oUsersModel.getProperty("/registeredUsers") || [];

            if (!oData.username || !oData.email || !oData.phone || !oData.department || !oData.role || !oData.status) {
                MessageToast.show(this._getText("userAllFieldsRequired"));
                return;
            }

            if (!this._isValidEmail(oData.email)) {
                MessageToast.show(this._getText("userEmailInvalid"));
                return;
            }

            if (!this._isValidPhone(oData.phone)) {
                MessageToast.show(this._getText("userPhoneInvalid"));
                return;
            }

            var iExistingIndex = aUsers.findIndex(function (oItem) {
                return oItem.username === oData.username;
            });

            if (oData.mode === "add") {
                if (iExistingIndex > -1) {
                    MessageToast.show(this._getText("usernameExists"));
                    return;
                }

                aUsers.unshift({
                    username: oData.username,
                    email: oData.email,
                    phone: oData.phone,
                    registrationDate: this._todayString(),
                    status: oData.status,
                    statusState: this._mapStatusToState(oData.status),
                    department: oData.department,
                    role: oData.role,
                    lastLogin: "-",
                    loginCount: 0,
                    createdBy: this._getCurrentOperator()
                });
                MessageToast.show(this._getText("createSuccess"));
            } else {
                if (iExistingIndex < 0) {
                    MessageToast.show(this._getText("userNotFound"));
                    return;
                }

                var oOld = aUsers[iExistingIndex];
                aUsers[iExistingIndex] = Object.assign({}, oOld, {
                    email: oData.email,
                    phone: oData.phone,
                    department: oData.department,
                    role: oData.role,
                    status: oData.status,
                    statusState: this._mapStatusToState(oData.status)
                });
                MessageToast.show(this._getText("saveSuccess"));
            }

            oUsersModel.setProperty("/registeredUsers", aUsers);
            this._refreshUserStatistics();
            this._oUserDialog.close();
        },

        _refreshUserStatistics: function () {
            var oUsersModel = this.getView().getModel("users");
            var aUsers = oUsersModel.getProperty("/registeredUsers") || [];
            var oNow = new Date();
            var sMonthPrefix = oNow.getFullYear() + "-" + String(oNow.getMonth() + 1).padStart(2, "0");
            var iActive = aUsers.filter(function (oUser) {
                return oUser.status === "ACTIVE";
            }).length;
            var iInactive = aUsers.filter(function (oUser) {
                return oUser.status === "INACTIVE";
            }).length;
            var iNewThisMonth = aUsers.filter(function (oUser) {
                return typeof oUser.registrationDate === "string" && oUser.registrationDate.indexOf(sMonthPrefix) === 0;
            }).length;

            oUsersModel.setProperty("/statistics/totalUsers", aUsers.length);
            oUsersModel.setProperty("/statistics/activeUsers", iActive);
            oUsersModel.setProperty("/statistics/inactiveUsers", iInactive);
            oUsersModel.setProperty("/statistics/thisMonthNewUsers", iNewThisMonth);
        },

        _isValidEmail: function (sEmail) {
            return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(sEmail || "").trim());
        },

        _isValidPhone: function (sPhone) {
            return /^\d{7,15}$/.test(String(sPhone || "").trim());
        },

        _mapStatusToState: function (sStatus) {
            if (sStatus === "ACTIVE") {
                return "Success";
            }
            if (sStatus === "INACTIVE") {
                return "Warning";
            }
            if (sStatus === "DISABLED") {
                return "Error";
            }
            return "None";
        },

        formatUserStatusText: function (sStatus) {
            var mKey = {
                ACTIVE: "statusActive",
                INACTIVE: "statusInactive",
                DISABLED: "statusDisabled"
            };
            return this._getText(mKey[sStatus] || "status");
        },

        _todayString: function () {
            var oDate = new Date();
            var sMonth = String(oDate.getMonth() + 1).padStart(2, "0");
            var sDay = String(oDate.getDate()).padStart(2, "0");
            return oDate.getFullYear() + "-" + sMonth + "-" + sDay;
        },

        _getCurrentOperator: function () {
            var oUserModel = this.getOwnerComponent().getModel("user");
            var oCurrentUser = oUserModel && oUserModel.getProperty("/currentUser");
            return (oCurrentUser && oCurrentUser.username) || "admin";
        },

        _getText: function (sKey, aArgs) {
            return this.getOwnerComponent().getModel("i18n").getResourceBundle().getText(sKey, aArgs);
        }
    });
});
