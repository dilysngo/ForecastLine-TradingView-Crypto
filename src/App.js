import React, { useRef } from 'react'
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

// const defaultParamsKline = {
//   symbol: 'BTCUSDT',
//   interval: '1h',
//   limit: '500',
// }

const getData = async (options) => {
  const { symbol, interval, limit } = options

  let klineData
  try {
    klineData = await getKlineData({
      symbol,
      interval,
      limit,
    })
  } catch (error) {}
  let forecastData
  try {
    forecastData = await getForecastData({ symbol: options.symbol })
    forecastData = forecastData.map((d) => ({ close: d.high }))
    forecastData = [...klineData, ...forecastData]
    forecastData = ema_inc(forecastData, 21)
  } catch (error) {}
  return {
    params: options,
    klineData,
    forecastData,
  }
}

async function registerSocket(ref, options) {
  let lastTime
  const binanceSocket = new WebSocket(
    `wss://stream.binance.com:9443/ws/${options.symbol.toLowerCase()}@kline_${options.interval}`
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
    ref.current.candleseries.update(forecastKline)

    // Update histogram
    ref.current.macd_histogram_series.update({
      time: forecastKline.time,
      value: forecastKline.volume,
      color: forecastKline.close > forecastKline.open ? 'rgba(14, 203, 129, 0.4)' : 'rgba(246, 70, 93, 0.4)',
    })

    // => Update EMA
    if (lastTime !== forecastKline.time) {
      lastTime = forecastKline.time
      try {
        const { forecastData } = await getData(options)
        if (forecastData) {
          const forecastNewEma = forecastData.map((item, index) => ({
            value: item.ema,
            time: item.time ? item.time : forecastKline.time + 1000 * 60 * (index + 1),
          }))
          ref.current.ema_series.setData(forecastNewEma)
        }
      } catch (error) {
        console.log('E1000', error)
      }
    }
  }
}

async function createAllSeriesChart(ref, options) {
  const domElement = ref.current.dom

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
      text: 'ForecastLineCrypto.com',
      fontSize: 100,
      color: 'rgba(256, 256, 256, 0.07)',
      visible: true,
    },
  }
  ref.current.chart = LightweightCharts.createChart(domElement, chartProperties)
  ref.current.candleseries = ref.current.chart.addCandlestickSeries({
    // upColor: '#00ff00',
    // downColor: '#ff0000',
    // borderUpColor: '#00ff00',
    // borderDownColor: '#ff0000',
    // wickUpColor: '#00ff00', // => candle beard color
    // wickDownColor: '#ff0000', // => candle beard color
    priceLineVisible: false,
  })

  /**
   * EMA
   */
  ref.current.ema_series = ref.current.chart.addLineSeries({
    title: 'Forecast Line',
    color: 'green',
    lineWidth: 1,
    crosshairMarkerVisible: false,
  })

  /**
   * MACD HISTOGRAM
   */
  ref.current.macd_histogram_series = ref.current.chart.addHistogramSeries({
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

  /**
   * Tooltip
   */
  var toolTip = document.createElement('div')
  toolTip.className = 'chart-title-indicator-container'
  domElement.appendChild(toolTip)
  // update tooltip
  ref.current.chart.subscribeCrosshairMove(function (tooltipParam) {
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
    var klineDataSeries = tooltipParam.seriesPrices.get(ref.current.candleseries)
    var volume = tooltipParam.seriesPrices.get(ref.current.macd_histogram_series)
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
}

async function renderChartWithData(ref, options) {
  const dataChart = await getData(options)
  ref.current.candleseries.setData(dataChart.klineData)

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

  const ema_data = dataChart.klineData.filter((d) => d.ema).map((d) => ({ time: d.time, value: d.ema }))
  ref.current.ema_series.setData(ema_data)

  const macd_histogram_data = dataChart.klineData
    // .filter((d) => d.macd_histogram)
    .map((d) => ({
      time: d.time,
      value: d.volume,
      color: d.close > d.open ? 'rgba(14, 203, 129, 0.4)' : 'rgba(246, 70, 93, 0.4)',
    }))
  ref.current.macd_histogram_series.setData(macd_histogram_data)

  /**
   * Handle forecast
   */
  registerSocket(ref, options)
}

const TIME_LIST = ['1m', '5m', '1h', '1d', '3d', '1w']

function App() {
  const ref = useRef({})
  const [symbol, setSymbol] = React.useState('BTCUSDT')
  const [interval, setIntervalTime] = React.useState(TIME_LIST[2])
  const [limit, setLimitCandle] = React.useState('500')

  React.useEffect(() => {
    const containerDom = document.getElementById('tvchart')
    ref.current.dom = containerDom
    createAllSeriesChart(ref, { symbol, interval, limit })
    renderChartWithData(ref, { symbol, interval, limit })
  }, [])

  return (
    <div className='wrapper-chart'>
      <div className='focus-area'>
        <a href='https://ForecastLineCrypto.com' target='_blank' rel='noreferrer'>
          <h2>ForecastLineCrypto.com</h2>
        </a>
        {/* 1m 3m 5m 15m 30m 1h 2h 4h 6h 8h 12h 1d 3d 1w 1M */}
        <button className='btn-pair-currency'>BTCUSDT</button>
        {TIME_LIST.map((time) => {
          return (
            <button
              key={time}
              // onClick={() => setIntervalTime(time)} style={{ color: interval === time ? '#fff' : '' }}
            >
              {time}
            </button>
          )
        })}
      </div>
      <div className='wrapper-chart-body'>
        <div className='tvchart' id='tvchart'></div>
      </div>
    </div>
  )
}

export default App
