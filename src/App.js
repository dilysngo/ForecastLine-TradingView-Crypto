import React from 'react'
import * as LightweightCharts from 'lightweight-charts'
import { getForecastData, getKlineData } from './services/storage/chart'
import { ema_inc } from './indicators'
// import Pusher from 'pusher-js';

// Enable pusher logging - don't include this in production
// Pusher.logToConsole = false;

// var pusher = new Pusher('5fac8a3813e9263926e4', {
//   cluster: 'ap1',
//   encrypted: true,
//   authEndpoint: 'http://127.0.0.1:3000/pusher/auth',
// });

function businessDayToString(businessDay) {
  return new Date(Date.UTC(businessDay.year, businessDay.month - 1, businessDay.day, 0, 0, 0)).toLocaleDateString()
}

const paramsKline = {
  symbol: 'BTCUSDT',
  interval: '1h',
  limit: '500',
}

const getData = async () => {
  let klineData
  try {
    klineData = await getKlineData(paramsKline)
  } catch (error) {}
  let forecastData
  try {
    forecastData = await getForecastData({ symbol: paramsKline.symbol })
    forecastData = forecastData.map((d) => ({ close: d.high }))
    forecastData = [...klineData, ...forecastData]
    forecastData = ema_inc(forecastData, 21)
  } catch (error) {}
  return {
    params: paramsKline,
    klineData,
    forecastData,
  }
}

// const LightweightCharts = window.LightweightCharts;

const renderChart = async (domElement) => {
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
  }
  const chart = LightweightCharts.createChart(domElement, chartProperties)
  const candleseries = chart.addCandlestickSeries({
    // upColor: '#00ff00',
    // downColor: '#ff0000',
    // borderUpColor: '#00ff00',
    // borderDownColor: '#ff0000',
    // wickUpColor: '#00ff00', // => candle beard color
    // wickDownColor: '#ff0000', // => candle beard color
    priceLineVisible: false,
  })

  /**
   * SetData
   */
  const dataChart = await getData()
  candleseries.setData(dataChart.klineData)

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
  })
  const ema_data = dataChart.klineData.filter((d) => d.ema).map((d) => ({ time: d.time, value: d.ema }))
  ema_series.setData(ema_data)

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
  })
  const macd_histogram_data = dataChart.klineData
    // .filter((d) => d.macd_histogram)
    .map((d) => ({
      time: d.time,
      value: d.volume,
      color: d.close > d.open ? 'rgba(14, 203, 129, 0.4)' : 'rgba(246, 70, 93, 0.4)',
    }))
  macd_histogram_series.setData(macd_histogram_data)

  /**
   * Tooltip
   */
  var toolTip = document.createElement('div')
  toolTip.className = 'chart-title-indicator-container'
  domElement.appendChild(toolTip)
  // update tooltip
  chart.subscribeCrosshairMove(function (tooltipParam) {
    if (
      !tooltipParam.time ||
      tooltipParam.point.x < 0 ||
      tooltipParam.point.x > chartProperties.width ||
      tooltipParam.point.y < 0 ||
      tooltipParam.point.y > chartProperties.height
    ) {
      // toolTip.style.display = 'none';
      return
    }

    var dateStr = LightweightCharts.isBusinessDay(tooltipParam.time)
      ? businessDayToString(tooltipParam.time)
      : new Date(tooltipParam.time * 1000).toISOString()

    // toolTip.style.display = 'block';
    var klineDataSeries = tooltipParam.seriesPrices.get(candleseries)
    var volume = tooltipParam.seriesPrices.get(macd_histogram_series)
    if (klineDataSeries) {
      toolTip.innerHTML = `
          <div class="default-label-box" style="padding-right: 5px;">
            ${dateStr} 
          </div> 
          <div class="box-number">
            <div>  
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
            </div>
            <div>
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
              </span>
            </div>
          </div>
        `
    }
  })

  /**
   * Handle forecast
   */
  let lastTime
  const binanceSocket = new WebSocket(
    `wss://stream.binance.com:9443/ws/${paramsKline.symbol.toLowerCase()}@kline_${paramsKline.interval}`
  )
  binanceSocket.onmessage = async function (event) {
    var message = JSON.parse(event.data)
    var candlestick = message.k
    let forecastKline = {
      time: candlestick.t / 1000,
      open: candlestick.o * 1,
      high: candlestick.h * 1,
      low: candlestick.l * 1,
      close: candlestick.c * 1,
      volume: candlestick.v * 1,
    }

    // => Update kline
    candleseries.update(forecastKline)

    // Update histogram
    macd_histogram_series.update({
      time: forecastKline.time,
      value: forecastKline.volume,
      color: forecastKline.close > forecastKline.open ? 'rgba(14, 203, 129, 0.4)' : 'rgba(246, 70, 93, 0.4)',
    })

    // => Update EMA
    if (lastTime !== forecastKline.time) {
      lastTime = forecastKline.time
      try {
        let { forecastData } = await getData()
        const forecastNewEma = forecastData.map((item, index) => ({
          value: item.ema,
          time: item.time ? item.time : forecastKline.time + 1000 * 60 * (index + 1),
        }))
        console.log(forecastNewEma)
        ema_series.setData(forecastNewEma)
      } catch (error) {
        console.log(error)
      }
    }
  }
}

function App() {
  const [rangeTime, setRangeTime] = React.useState('1h')

  React.useEffect(() => {
    const containerDom = document.getElementById('tvchart')
    renderChart(containerDom, '1h')
  }, [])

  return (
    <div className='wrapper-chart'>
      <div className='focus-area'>
        <a href='https://mmrocket.com' target='_blank' rel='noreferrer'>
          <h2>MMRocket.com</h2>
        </a>
        {/* 1m 3m 5m 15m 30m 1h 2h 4h 6h 8h 12h 1d 3d 1w 1M */}
        <button className='btn-pair-currency'>BTCUSDT</button>
        <button
          //</div>onClick={() => setRangeTime('1m')}
          style={{ color: rangeTime === '1m' ? '#fff' : '' }}
        >
          1m
        </button>
        <button
          //</div>onClick={() => setRangeTime('5m')}
          style={{ color: rangeTime === '5m' ? '#fff' : '' }}
        >
          5m
        </button>
        <button onClick={() => setRangeTime('1h')} style={{ color: rangeTime === '1h' ? '#fff' : '' }}>
          1H
        </button>
        <button
          //</div>onClick={() => setRangeTime('1d')}
          style={{ color: rangeTime === '1d' ? '#fff' : '' }}
        >
          1D
        </button>
        <button
          //</div>onClick={() => setRangeTime('3d')}
          style={{ color: rangeTime === '3d' ? '#fff' : '' }}
        >
          3D
        </button>
        <button
          //</div>onClick={() => setRangeTime('1w')}
          style={{ color: rangeTime === '1w' ? '#fff' : '' }}
        >
          1W
        </button>
      </div>
      <div className='wrapper-chart-body'>
        <div className='tvchart' id='tvchart'></div>
      </div>
    </div>
  )
}

export default App
