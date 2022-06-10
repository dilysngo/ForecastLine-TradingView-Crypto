import React from 'react';
import {useEffect, useRef, useState} from 'react';
import * as LightweightCharts from 'lightweight-charts';

let chart, candlestickSeries;

const CandleChart = ({market, symbol, decimals}) => {
  const chartRef = useRef();
  const [initCandles, setInitCandles] = useState([]);
  const [lastCandle, setLastCandle] = useState({});
  const wsRef = useRef();

  useEffect(() => {
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
      return setInitCandles(klinedata);
    };
    getData();
  }, [market, symbol]);

  useEffect(() => {
    const binanceSocket = new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@kline_1m');
    binanceSocket.onmessage = async function (event) {
      setLastCandle(JSON.parse(event.data));
    };
    return () => wsRef.current.close();
  }, [market, symbol]);

  useEffect(() => {
    chart = LightweightCharts.createChart(chartRef.current, {
      width: chartRef.current.offsetWidth,
      height: chartRef.current.offsetHeight,
      alignLabels: true,
      timeScale: {
        rightOffset: 0,
        barSpacing: 15,
        fixLeftEdge: false,
        lockVisibleTimeRangeOnResize: true,
        rightBarStaysOnScroll: true,
        borderVisible: false,
        visible: true,
        timeVisible: true,
        secondsVisible: true,
      },
      rightPriceScale: {
        scaleMargins: {
          top: 0.3,
          bottom: 0.25,
        },
        borderVisible: false,
      },
      priceScale: {
        autoScale: true,
      },
      grid: {
        vertLines: {
          color: 'yellow',
          style: 4,
        },
        horzLines: {
          color: 'yellow',
          style: 4,
        },
      },
    });

    candlestickSeries = chart.addCandlestickSeries({
      priceScaleId: 'right',
      borderVisible: false,
      wickVisible: true,
      priceFormat: {
        type: 'custom',
        minMove: '0.00000001',
        formatter: (price) => {
          return parseFloat(price).toFixed(decimals);
        },
      },
    });

    candlestickSeries.setData(initCandles);

    return () => chart.remove();
  }, [initCandles, decimals]);

  useEffect(() => {
    if (!(lastCandle && Object.keys(lastCandle).length === 0 && lastCandle.constructor === Object)) {
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
        candlestickSeries.update(forecastKline);
      };
    }
  }, [lastCandle]);

  useEffect(() => {
    const handler = () => {
      chart.resize(chartRef.current.offsetWidth, 1000);
    };
    window.addEventListener('resize', handler);
    return () => {
      window.removeEventListener('resize', handler);
    };
  }, []);

  return <div ref={chartRef} id={`${symbol}${market}chart`} style={{position: 'relative', width: '100%'}}></div>;
};

export default CandleChart;
