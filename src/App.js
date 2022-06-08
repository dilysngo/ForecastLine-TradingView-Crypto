import React from 'react';
import * as LightweightCharts from 'lightweight-charts';
import {ema_inc} from './indicators';
import Pusher from 'pusher-js';

// Enable pusher logging - don't include this in production
Pusher.logToConsole = false;

var pusher = new Pusher('5fac8a3813e9263926e4', {
  cluster: 'ap1',
  encrypted: true,
  authEndpoint: 'http://127.0.0.1:3000/pusher/auth',
});

const getData = async () => {
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
  klinedata = ema_inc(klinedata, 21);
  return klinedata;
};

const renderChart = async (domElement) => {
  const chartProperties = {
    width: domElement.offsetWidth,
    height: domElement.offsetHeight,
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
      mode: LightweightCharts.CrosshairMode.Normal,
    },
    priceScale: {
      borderColor: 'rgba(197, 203, 206, 0.8)', // price XAxit line color
    },
    timeScale: {
      borderColor: 'rgba(197, 203, 206, 0.8)', // time YAxit line color
      timeVisible: true,
      secondsVisible: true,
    },
    pane: 1,
  };
  const chart = LightweightCharts.createChart(domElement, chartProperties);
  const candleseries = chart.addCandlestickSeries({
    // upColor: '#00ff00',
    // downColor: '#ff0000',
    // borderUpColor: '#00ff00',
    // borderDownColor: '#ff0000',
    // wickUpColor: '#00ff00',
    // wickDownColor: '#ff0000',
  });

  /**
   * SetData
   */
  const klinedata = await getData();
  candleseries.setData(klinedata);

  // EMA
  const ema_series = chart.addLineSeries({title: 'Forecast Line', color: 'green', lineWidth: 1});
  const ema_data = klinedata.filter((d) => d.ema).map((d) => ({time: d.time, value: d.ema}));
  ema_series.setData(ema_data);

  // MACD HISTOGRAM
  // const macd_histogram_series = chart.addHistogramSeries({
  //   pane: 1,
  // });
  // const macd_histogram_data = klinedata
  //   .filter((d) => d.macd_histogram)
  //   .map((d) => ({
  //     time: d.time,
  //     value: d.volume,
  //     color: d.close > d.open ? 'rgb(14, 203, 129)' : 'rgb(246, 70, 93)',
  //   }));
  // macd_histogram_series.setData(macd_histogram_data);

  /**
   * Handle next data
   */
  let forecastLine = [
    {high: 30661.24, low: 32029.93, time: 1654593585},
    {high: 30745.07, low: 31965.9, time: 1654597185},
    {high: 30461.65, low: 31987.92, time: 1654600785},
    {high: 30429.52, low: 31983.63, time: 1654604385},
    {high: 30409.88, low: 31976.06, time: 1654607985},
    {high: 30640.58, low: 31947.76, time: 1654611585},
    {high: 30853.17, low: 31995.47, time: 1654615185},
    {high: 30956.04, low: 31996.0, time: 1654618785},
    {high: 30426.73, low: 31988.13, time: 1654622385},
    {high: 30418.52, low: 31983.92, time: 1654625985},
    {high: 30439.07, low: 31973.02, time: 1654629585},
    {high: 30739.93, low: 31979.68, time: 1654633185},
    {high: 30446.36, low: 31997.61, time: 1654636785},
    {high: 30747.11, low: 30010.38, time: 1654640385},
    {high: 31184.54, low: 32021.59, time: 1654643985},
  ];

  let lastTime;
  var binanceSocket = new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@kline_1m');
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
  React.useEffect(() => {
    renderChart(document.getElementById('tvchart'));
  }, []);
  return (
    <div className="wrapper-chart">
      <div className="tvchart" id="tvchart"></div>
    </div>
  );
}

export default App;
