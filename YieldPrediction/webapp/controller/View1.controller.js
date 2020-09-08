sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/core/util/Export",
	"sap/ui/core/util/ExportTypeCSV"
], function (Controller) {
	"use strict";

	return Controller.extend("com.sap.YieldPrediction.controller.View1", {
		onInit: function () {
			this.localModel = new sap.ui.model.json.JSONModel();
			this.getView().setModel(this.localModel, "localModel");
		},

		onUpload: function (e) {
			console.log("onUpload");
			//this._importXLSX(e.getParameter("files") && e.getParameter("files")[0]);
			this._importCSV(e.getParameter("files") && e.getParameter("files")[0]);
			sap.ui.core.BusyIndicator.show(0);
		},

		//CSV
		_importCSV: function (oFile) {
			var that = this;
			if (oFile && window.FileReader) {
				var reader = new FileReader();
				reader.onload = function (evt) {
					var strCSV = evt.target.result; //string in CSV 
					that.csvJSON(strCSV);
				};
				reader.readAsText(oFile);
			}
		},

		csvJSON: function (csv) {
			var lines = csv.split("\n");
			var result = [];
			var delimiter = ",";
			var headers = lines[0].split(delimiter);
			this.numberofRows = lines.length - 1;
			for (var i = 1; i < lines.length; i++) {
				var obj = {};
				var currentline = lines[i].split(delimiter);
				obj["serialNumber"] = i;
				for (var j = 0; j < headers.length; j++) {
					obj[headers[j]] = currentline[j];
				}
				obj["Yield_prediction"] = "";
				result.push(obj);
			}
			var oStringResult = JSON.stringify(result);
			var oFinalResult = JSON.parse(oStringResult.replace(/\\r/g, ""));
			this.localModel.setData({
				items: oFinalResult
			});
			//this.localModel.refresh(true);
		},

		//XLSX file format
		_importXLSX: function (file) {
			var that = this;
			var excelData = {};
			if (file && window.FileReader) {
				var reader = new FileReader();
				reader.onload = function (e) {
					var data = e.target.result;
					var workbook = XLSX.read(data, {
						type: 'binary'
					});
					workbook.SheetNames.forEach(function (sheetName) {
						// Here is your object for every sheet in workbook
						excelData = XLSX.utils.sheet_to_row_object_array(workbook.Sheets[sheetName]);

					});
					// Setting the data to the local model 
					that.localModel.setData({
						items: excelData
					});
					//that.localModel.refresh(true);
				};
				reader.onerror = function (ex) {
					console.log(ex);
				};
				reader.readAsBinaryString(file);
			}
		},

		//calculate prediction
		calculateYieldPrediction: function (serialNumber) {

			//close busy indicator
			if (this.numberofRows == serialNumber) {
				sap.ui.core.BusyIndicator.hide();
			}

			//season validations
			var that = this;
			var metadata = this.localModel.aBindings[0].oList[serialNumber - 1];
			var season = metadata.Season;
			if ((season !== "Kharif") && (season !== "kharif") && (season !== "Rabi") && (season !== "rabi")) {
				var item = that.localModel.aBindings[0].oList[serialNumber - 1];
				item["Yield_prediction"] = "season unknown";
				return "season unknown";
			}

			//call api
			var payload = {
				"Chaffygrains_pc": metadata.Chaffygrains_pc,
				"DAT_FertApp": metadata.DAT_FertApp,
				"District": metadata.District,
				"Farmer": metadata.Farmer,
				"Grains_perpanicle": metadata.Grains_perpanicle,
				"K2O_kgpacre": metadata.K2O_kgpacre,
				"N_kgpacre": metadata.N_kgpacre,
				"P2O5_kgpacre": metadata.P2O5_kgpacre,
				"Panicle_perhill": metadata.Panicle_perhill,
				"Paniclelength_cm": metadata.Paniclelength_cm,
				"S_kgpacre": metadata.S_kgpacre,
				"Season": metadata.Season,
				"Tiller_perhill": metadata.Tiller_perhill,
				"Variety": metadata.Variety,
				"grain1000weight_g": metadata.grain1000weight_g,
				"Field_ID": metadata.serialNumber
			};

			var result = "initial";
			var aData = $.ajax({
				type: "POST",
				url: "/comsapYieldPrediction/YieldPredictionDest/app/pipeline-modeler/openapi/service/cb97ce38-0bcd-4ad8-9531-6daa55a45524/predict",
				headers: {
					"x-requested-with": "XMLHttpRequest"
				},
				data: JSON.stringify(payload),
				contentType: "application/json",
				async: false,
				success: function (data, textStatus, jqXHR) {
					console.log(data);
					var row = that.localModel.aBindings[0].oList[serialNumber - 1];
					row["Yield_prediction"] = data.predictions[0].toFixed(4);
					//that.localModel.refresh(true);
					//that.getView().byId("predictionTable").getModel().refresh(true);
					//that.getView().byId("predictionTable").getBinding("items").refresh();
					result = data.predictions[0].toFixed(4);
				},
				error: function (error) {
					console.log(error);
					var row = that.localModel.aBindings[0].oList[serialNumber - 1];
					row["Yield_prediction"] = "undefined";
					result = "undefined";
				}
			});
			//call end
			return result;
		},

		onDataExport: function () {

			var oModel = this.localModel;
			var oExport = new sap.ui.core.util.Export({
				exportType: new sap.ui.core.util.ExportTypeCSV({
					fileExtension: "csv",
					separatorChar: ","
				}),

				models: oModel,

				rows: {
					path: "/items"
				},
				columns: [
					{name: "Farmer", template: {content: "{Farmer}"}},
					{name: "Variety", template: {content: "{Variety}"}},
					{name: "Season", template: {content: "{Season}"}},
					{name: "District", template: {content: "{District}"}},
					{name: "DAT_FertApp", template: {content: "{DAT_FertApp}"}},
					{name: "N_kgpacre", template: {content: "{N_kgpacre}"}},
					{name: "P2O5_kgpacre", template: {content: "{P2O5_kgpacre}"}},
					{name: "K2O_kgpacre", template: {content: "{K2O_kgpacre}"}},
					{name: "S_kgpacre", template: {content: "{S_kgpacre}"}},
					{name: "Tiller_perhill", template: {content: "{Tiller_perhill}"}},
					{name: "Panicle_perhill", template: {content: "{Panicle_perhill}"}},
					{name: "Paniclelength_cm", template: {content: "{Paniclelength_cm}"}},
					{name: "Grains_perpanicle", template: {content: "{Grains_perpanicle}"}},
					{name: "Chaffygrains_pc", template: {content: "{Chaffygrains_pc}"}},
					{name: "grain1000weight_g", template: {content: "{grain1000weight_g}"}},
					{name: "Yield_qperacre", template: {content: "{Yield_qperacre}"}},
					{name: "Yield_prediction", template: {content: "{Yield_prediction}"}}]
			});
			
			oExport.saveFile().catch(function (oError) {
				console.log(oError);
			}).then(function () {
				oExport.destroy();
			});
		}
	});
});