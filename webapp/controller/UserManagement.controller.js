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
            MessageBox.confirm("确认删除用户: " + oUser.username + " ?", {
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
                    MessageToast.show("删除成功");
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
                status: bEditMode ? (oUser.status || "活跃") : "活跃"
            });

            if (!this._oUserDialog) {
                this._oUserDialog = new Dialog({
                    title: "用户信息",
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
                                new Label({ text: "用户名" }),
                                new Input({
                                    value: "{dialog>/username}",
                                    editable: "{= ${dialog>/mode} === 'add' }"
                                }),
                                new Label({ text: "邮箱" }),
                                new Input({ value: "{dialog>/email}" }),
                                new Label({ text: "联系电话" }),
                                new Input({ value: "{dialog>/phone}" }),
                                new Label({ text: "部门" }),
                                new Input({ value: "{dialog>/department}" }),
                                new Label({ text: "角色" }),
                                new Input({ value: "{dialog>/role}" }),
                                new Label({ text: "状态" }),
                                new Select({
                                    selectedKey: "{dialog>/status}",
                                    items: [
                                        new Item({ key: "活跃", text: "活跃" }),
                                        new Item({ key: "不活跃", text: "不活跃" }),
                                        new Item({ key: "禁用", text: "禁用" })
                                    ]
                                })
                            ]
                        })
                    ],
                    beginButton: new Button({
                        text: "保存",
                        type: "Emphasized",
                        press: function () {
                            that._onSaveDialogUser();
                        }
                    }),
                    endButton: new Button({
                        text: "取消",
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

            if (!oData.username || !oData.email || !oData.phone || !oData.department || !oData.role) {
                MessageToast.show("请完整填写所有字段");
                return;
            }

            if (!this._isValidEmail(oData.email)) {
                MessageToast.show("邮箱格式不正确");
                return;
            }

            if (!this._isValidPhone(oData.phone)) {
                MessageToast.show("联系电话格式不正确");
                return;
            }

            var iExistingIndex = aUsers.findIndex(function (oItem) {
                return oItem.username === oData.username;
            });

            if (oData.mode === "add") {
                if (iExistingIndex > -1) {
                    MessageToast.show("用户名已存在");
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
                MessageToast.show("新增成功");
            } else {
                if (iExistingIndex < 0) {
                    MessageToast.show("用户不存在");
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
                MessageToast.show("保存成功");
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
                return oUser.status === "活跃";
            }).length;
            var iInactive = aUsers.filter(function (oUser) {
                return oUser.status === "不活跃";
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
            if (sStatus === "活跃") {
                return "Success";
            }
            if (sStatus === "不活跃") {
                return "Warning";
            }
            if (sStatus === "禁用") {
                return "Error";
            }
            return "None";
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
        }
    });
});
