"use strict";

var flycastFlowConfig = {
    apiKey: "YOUR_API_KEY_HERE",
    chartElementId: "chart-container",
    chartTitleId: "chart-title",
    dischargeColor: "#E8CD46",
    gageColor: "#984B43",
    fontSize: 12,
};

am4core.ready(function () {
    getData(createFlowGraph, console.error, flycastFlowConfig.apiKey);
});

function createFlowGraph(rawData) {
    _setTitle(rawData);
    am4core.useTheme(am4themes_animated);
    var chart = _createChart(flycastFlowConfig.chartElementId);

    var dateAxis = _createDateAxis(chart);
    var dischargeAxis = _createDischargeAxis(chart);
    var dischargeSeries = _createDischargeSeries(chart);
    var gageAxis = _createGageAxis(chart);
    var gageSeries = _createGageSeries(chart, gageAxis);

    chart.cursor.snapToSeries = dischargeSeries;
    chart.cursor.xAxis = dateAxis;

    _setDischargeAxisLimits(rawData, dischargeAxis);
    _setGageAxisLimits(rawData, gageAxis);

    chart.data = rawData.flow_data.map(function (flow) {
        return {
            Date: _parseDate(flow.date),
            Discharge: flow.discharge,
            Gage_Height: flow.gage_height,
        };
    });
}

function getData(onSuccess, onError, apiKey) {
    var chartDiv = document.getElementById(flycastFlowConfig.chartElementId);
    var river_code = chartDiv.getAttribute("data-river-code");
    var url = "https://api.flycastusa.com/FlyCast/v1/river_flows/" + river_code;

    var request = new XMLHttpRequest();
    request.open("GET", url, true);
    request.setRequestHeader("x-api-key", apiKey);

    request.onload = function () {
        if (this.status >= 200 && this.status < 400) {
            var data = JSON.parse(this.response);
            onSuccess(data);
        } else {
            onError(this.status);
        }
    };

    request.onerror = function () {
        onError("Failed to fetch data from FlyCast API");
    };
    request.send();
}

function _setTitle(rawData) {
    var titleElem = document.getElementById(flycastFlowConfig.chartTitleId);
    titleElem.textContent = rawData.common_name;
}

function _createDateAxis(chart) {
    var dateAxis = chart.xAxes.push(new am4charts.DateAxis());
    dateAxis.dataFields.category = "category";
    dateAxis.renderer.minGridDistance = 50;
    dateAxis.renderer.grid.template.disabled = true;
    dateAxis.fontSize = flycastFlowConfig.fontSize;
    dateAxis.adapter.add("getTooltipText", function (text) {
        return ">>> " + text + " <<<";
    });
    return dateAxis;
}

function _createDischargeAxis(chart) {
    var dischargeAxis = chart.yAxes.push(new am4charts.ValueAxis());
    dischargeAxis.title.text = "Discharge (cfs)";
    dischargeAxis.renderer.grid.template.disabled = true;
    dischargeAxis.fontSize = flycastFlowConfig.fontSize;
    return dischargeAxis;
}

function _createGageAxis(chart) {
    var gageAxis = chart.yAxes.push(new am4charts.ValueAxis());
    gageAxis.title.text = "Gage Height (ft)";
    gageAxis.renderer.opposite = true;
    gageAxis.renderer.grid.template.disabled = true;
    gageAxis.fontSize = flycastFlowConfig.fontSize;
    return gageAxis;
}

function _createDischargeSeries(chart) {
    var dischargeSeries = chart.series.push(new am4charts.LineSeries());
    dischargeSeries.dataFields.valueY = "Discharge";
    dischargeSeries.dataFields.dateX = "Date";
    dischargeSeries.dataFields.fontSize = flycastFlowConfig.fontSize;
    dischargeSeries.stroke = am4core.color(flycastFlowConfig.dischargeColor);
    dischargeSeries.name = "Discharge";
    dischargeSeries.strokeWidth = 3;
    dischargeSeries.tooltipText = "{Discharge}";
    dischargeSeries.tooltip.pointerOrientation = "vertical";
    return dischargeSeries;
}

function _createGageSeries(chart, gageAxis) {
    var gageSeries = chart.series.push(new am4charts.LineSeries());
    gageSeries.dataFields.valueY = "Gage_Height";
    gageSeries.dataFields.dateX = "Date";
    gageSeries.name = "Gage Height";
    gageSeries.stroke = am4core.color(flycastFlowConfig.gageColor);
    gageSeries.strokeWidth = 3;
    gageSeries.tooltip.pointerOrientation = "vertical";
    gageSeries.yAxis = gageAxis;
    return gageSeries;
}

function _createChart(divId) {
    var chart = am4core.create(divId, am4charts.XYChart);
    chart.cursor = new am4charts.XYCursor();
    chart.legend = new am4charts.Legend();
    chart.legend.fontSize = flycastFlowConfig.fontSize;
    chart.numberFormatter.numberFormat = "#.00";
    return chart;
}

function _setDischargeAxisLimits(rawData, dischargeAxis) {
    var minDischarge = Math.min.apply(
        null,
        rawData.flow_data.map(function (flow) {
            return flow.discharge;
        })
    );
    var maxDischarge = Math.max.apply(
        null,
        rawData.flow_data.map(function (flow) {
            return flow.discharge;
        })
    );
    var diffDischarge = maxDischarge - minDischarge;
    if (diffDischarge < 0.2 * maxDischarge) {
        dischargeAxis.min = minDischarge * 0.9;
        dischargeAxis.max = maxDischarge * 1.1;
    } else {
        dischargeAxis.min = minDischarge - diffDischarge * 0.2;
        dischargeAxis.max = maxDischarge + diffDischarge * 0.2;
    }
}

function _setGageAxisLimits(rawData, gageAxis) {
    var minGage = Math.min.apply(
        null,
        rawData.flow_data.map(function (flow) {
            return flow.gage_height;
        })
    );
    var maxGage = Math.max.apply(
        null,
        rawData.flow_data.map(function (flow) {
            return flow.gage_height;
        })
    );
    var diffGage = maxGage - minGage;
    if (diffGage < 0.2 * maxGage) {
        gageAxis.min = minGage * 0.85;
        gageAxis.max = maxGage * 1.05;
    } else {
        gageAxis.min = minGage - diffGage * 0.2;
        gageAxis.max = maxGage + diffGage * 0.15;
    }
}

// Parse datetime input in the format: "2020-03-02 00:00:00"
function _parseDate(input) {
    var datetime = input.split(" ");
    var date_split = datetime[0].split("-");
    var year = parseInt(date_split[0]);
    // Month is zero indexed
    var month = parseInt(date_split[1]) - 1;
    var day = parseInt(date_split[2]);

    var time_split = datetime[1].split(":");
    var hour = parseInt(time_split[0]);
    var minute = parseInt(time_split[1]);
    var second = parseInt(time_split[2]);
    return new Date(year, month, day, hour, minute, second);
}
