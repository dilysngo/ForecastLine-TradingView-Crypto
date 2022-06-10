import React from 'react';
import * as LightweightCharts from 'lightweight-charts';
import {sma_inc, ema_inc, markers_inc} from './indicators';
// import Pusher from 'pusher-js';

// Enable pusher logging - don't include this in production
// Pusher.logToConsole = false;

// var pusher = new Pusher('5fac8a3813e9263926e4', {
//   cluster: 'ap1',
//   encrypted: true,
//   authEndpoint: 'http://127.0.0.1:3000/pusher/auth',
// });

function businessDayToString(businessDay) {
  return new Date(Date.UTC(businessDay.year, businessDay.month - 1, businessDay.day, 0, 0, 0)).toLocaleDateString();
}

const getData = async () => {
  // 1m 3m 5m 15m 30m 1h 2h 4h 6h 8h 12h 1d 3d 1w 1M
  const resp = await fetch('https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1m&limit=500');
  const data = await resp.json();
  let klinedata = data.map((d) => ({
    time: d[0] / 1000,
    open: d[1] * 1,
    high: d[2] * 1,
    low: d[3] * 1,
    close: d[4] * 1,
    volume: d[5] * 1,
  }));
  klinedata = sma_inc(klinedata, 7);
  klinedata = ema_inc(klinedata, 21);
  klinedata = markers_inc(klinedata);
  return klinedata;
};

// const LightweightCharts = window.LightweightCharts;

const renderChart = async (domElement, rTime) => {
  const chartProperties = {
    width: domElement.offsetWidth,
    height: domElement.offsetHeight,
    pane: 1,
    layout: {
      backgroundColor: 'rgb(17, 17, 39)', // background of chart
      textColor: 'rgba(255, 255, 255, 0.9)', // color of chart
    },
    grid: {
      vertLines: {
        color: 'rgb(41, 44, 58)', // gird line of chart
      },
      horzLines: {
        color: 'rgb(41, 44, 58)', // gird line of chart
      },
    },
    crosshair: {
      mode: LightweightCharts.CrosshairMode.Normal, // This mode allows crosshair to move freely on the chart.
    },
    priceScale: {
      borderColor: 'rgba(197, 203, 206, 0.8)', // price XAxit line color
    },
    timeScale: {
      borderColor: 'rgba(197, 203, 206, 0.8)', // time YAxit line color
      timeVisible: true,
      secondsVisible: true,
    },
    watermark: {
      text: 'MMRocket.com',
      fontSize: 100,
      color: 'rgba(256, 256, 256, 0.07)',
      visible: true,
    },
  };
  const chart = LightweightCharts.createChart(domElement, chartProperties);
  const candleseries = chart.addCandlestickSeries({
    // upColor: '#00ff00',
    // downColor: '#ff0000',
    // borderUpColor: '#00ff00',
    // borderDownColor: '#ff0000',
    // wickUpColor: '#00ff00', // => candle beard color
    // wickDownColor: '#ff0000', // => candle beard color
    priceLineVisible: false,
  });

  /**
   * SetData
   */
  const klinedata = await getData(rTime);
  candleseries.setData(klinedata);

  //MARKERS
  // candleseries.setMarkers(
  //   klinedata
  //     .filter((d) => d.long || d.short)
  //     .map((d) =>
  //       d.long
  //         ? {
  //             time: d.time,
  //             position: 'belowBar',
  //             color: 'green',
  //             shape: 'arrowUp',
  //             text: 'LONG',
  //           }
  //         : {
  //             time: d.time,
  //             position: 'aboveBar',
  //             color: 'red',
  //             shape: 'arrowDown',
  //             text: 'SHORT',
  //           }
  //     )
  // );

  /**
   * EMA
   */
  const ema_series = chart.addLineSeries({
    title: 'Forecast Line',
    color: 'green',
    lineWidth: 1,
    crosshairMarkerVisible: false,
  });
  const ema_data = klinedata.filter((d) => d.ema).map((d) => ({time: d.time, value: d.ema}));
  ema_series.setData(ema_data);

  /**
   * MACD HISTOGRAM
   */
  const macd_histogram_series = chart.addHistogramSeries({
    pane: 1,
    priceLineColor: 'rgba(14,203,129,0.6)',
    lineWidth: 1,
    priceFormat: {
      type: 'volume',
    },
    overlay: true,
    scaleMargins: {
      top: 0.8,
      bottom: 0,
    },
  });
  const macd_histogram_data = klinedata
    // .filter((d) => d.macd_histogram)
    .map((d) => ({
      time: d.time,
      value: d.volume,
      color: d.close > d.open ? 'rgba(14, 203, 129, 0.4)' : 'rgba(246, 70, 93, 0.4)',
    }));
  macd_histogram_series.setData(macd_histogram_data);

  /**
   * Tooltip
   */
  var toolTip = document.createElement('div');
  toolTip.className = 'chart-title-indicator-container';
  domElement.appendChild(toolTip);

  // update tooltip
  chart.subscribeCrosshairMove(function (param) {
    if (
      !param.time ||
      param.point.x < 0 ||
      param.point.x > chartProperties.width ||
      param.point.y < 0 ||
      param.point.y > chartProperties.height
    ) {
      // toolTip.style.display = 'none';
      return;
    }

    var dateStr = LightweightCharts.isBusinessDay(param.time)
      ? businessDayToString(param.time)
      : new Date(param.time * 1000).toISOString();

    // toolTip.style.display = 'block';
    var klineDataSeries = param.seriesPrices.get(candleseries);
    var volume = param.seriesPrices.get(macd_histogram_series);
    if (klineDataSeries) {
      toolTip.innerHTML = `
          <span class="default-label-box" style="padding-right: 5px;">
            ${dateStr} 
          </span>
          <span class="default-label-box" style="padding-right: 5px;">
            Open:
          </span>
          <span class="default-label-box" style="padding-right: 5px; color: rgb(246, 70, 93);">
            ${(Math.round(klineDataSeries.open * 100) / 100).toFixed(2)}
          </span>
          <span class="default-label-box" style="padding-right: 5px;">
            High:
          </span>
          <span class="default-label-box" style="padding-right: 5px; color: rgb(246, 70, 93);">
            ${(Math.round(klineDataSeries.high * 100) / 100).toFixed(2)}
          </span>
          <span class="default-label-box" style="padding-right: 5px;">
            Low:
          </span>
          <span class="default-label-box" style="padding-right: 5px; color: rgb(246, 70, 93);">
          ${(Math.round(klineDataSeries.low * 100) / 100).toFixed(2)}
          </span>
          <span class="default-label-box" style="padding-right: 5px;">
            Close:
          </span>
          <span class="default-label-box" style="padding-right: 5px; color: rgb(246, 70, 93);">
          ${(Math.round(klineDataSeries.close * 100) / 100).toFixed(2)}
          </span>
          <span class="default-label-box title_amplitude_label" style="padding-right: 5px;">
          Volume:
          </span>
          <span class="default-label-box title_amplitude_value" style="padding-right: 5px; color: rgb(246, 70, 93);">
          ${(Math.round(volume * 100) / 100).toFixed(2)}
          </span>`;
    }
    // var left = param.point.x;
    // if (left > chartProperties.width - toolTipWidth - toolTipMargin) {
    //   left = chartProperties.width - toolTipWidth;
    // } else if (left < toolTipWidth / 2) {
    //   left = priceScaleWidth;
    // }
    // toolTip.style.top = 0 + 'px';
    // toolTip.style.left = left + 'px';
  });

  /**
   * Handle forecast
   */
  let forecastLine = [
    {high: 30361.24, low: 32029.93, time: 1654593585},
    {high: 30345.07, low: 31965.9, time: 1654597185},
    {high: 30361.65, low: 31987.92, time: 1654600785},
    {high: 30329.52, low: 31983.63, time: 1654604385},
    {high: 30309.88, low: 31976.06, time: 1654607985},
    {high: 30340.58, low: 31947.76, time: 1654611585},
    {high: 30353.17, low: 31995.47, time: 1654615185},
    {high: 30356.04, low: 31996.0, time: 1654618785},
    {high: 30426.73, low: 31988.13, time: 1654622385},
    {high: 30418.52, low: 31983.92, time: 1654625985},
    {high: 30439.07, low: 31973.02, time: 1654629585},
    {high: 30439.93, low: 31979.68, time: 1654633185},
    {high: 30446.36, low: 31997.61, time: 1654636785},
    {high: 30547.11, low: 30010.38, time: 1654640385},
    {high: 30584.54, low: 32021.59, time: 1654643985},
  ];

  let lastTime;
  const binanceSocket = new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@kline_1m');
  binanceSocket.onmessage = async function (event) {
    var message = JSON.parse(event.data);
    var candlestick = message.k;
    let forecastKline = {
      time: candlestick.t / 1000,
      open: candlestick.o * 1,
      high: candlestick.h * 1,
      low: candlestick.l * 1,
      close: candlestick.c * 1,
      volume: candlestick.v * 1,
    };
    candleseries.update(forecastKline);

    if (lastTime !== forecastKline.time) {
      lastTime = forecastKline.time;
      let newEmaData = await getData();
      newEmaData = newEmaData.filter((d) => d.ema).map((d) => ({time: d.time, value: d.ema}));
      const forecastNewEma = forecastLine.map((item, index) => ({
        value: item.high,
        time: newEmaData[newEmaData.length - 1].time + 1000 * 60 * (index + 1),
      }));
      ema_series.setData([...newEmaData, ...forecastNewEma]);
    }
  };
};

function App() {
  const [rangeTime, setRangeTime] = React.useState('1h');

  React.useEffect(() => {
    renderChart(document.getElementById('tvchart'), '1m');
  }, []);

  return (
    <div className="wrapper-chart">
      <div className="focus-area">
        <h2>MMRocket.com</h2>
        {/* 1m 3m 5m 15m 30m 1h 2h 4h 6h 8h 12h 1d 3d 1w 1M */}
        <button className="btn-pair-currency">BTCUSDT</button>
        <button
          //</div>onClick={() => setRangeTime('1m')}
          style={{color: rangeTime === '1m' ? '#fff' : ''}}
        >
          1m
        </button>
        <button
          //</div>onClick={() => setRangeTime('5m')}
          style={{color: rangeTime === '5m' ? '#fff' : ''}}
        >
          5m
        </button>
        <button onClick={() => setRangeTime('1h')} style={{color: rangeTime === '1h' ? '#fff' : ''}}>
          1H
        </button>
        <button
          //</div>onClick={() => setRangeTime('1d')}
          style={{color: rangeTime === '1d' ? '#fff' : ''}}
        >
          1D
        </button>
        <button
          //</div>onClick={() => setRangeTime('3d')}
          style={{color: rangeTime === '3d' ? '#fff' : ''}}
        >
          3D
        </button>
        <button
          //</div>onClick={() => setRangeTime('1w')}
          style={{color: rangeTime === '1w' ? '#fff' : ''}}
        >
          1W
        </button>
      </div>
      <div className="wrapper-chart-body">
        <div className="tvchart" id="tvchart"></div>
      </div>
    </div>
  );
}

export default App;
