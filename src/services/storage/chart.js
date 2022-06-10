import axios from '../curl/Axios'
import { ROOT_API } from '../../constants/index'
import { createStorageTTL, getFromStorageTTL, MEDIUM_TTL } from './index'

export const getForecastData = async (pairSymbol) => {
  return new Promise((resolve, reject) => {
    ;(async () => {
      try {
        const cache_key = `m:f:${pairSymbol.symbol.toLowerCase()}` // m for mmrocket , f for forecast
        let data

        const content = getFromStorageTTL(cache_key)
        if (content !== null) {
          data = content
        }

        // Ensure we have valid cached data
        if (data === undefined && pairSymbol) {
          let result = null
          try {
            const formData = new FormData()
            Object.entries(pairSymbol).map(([key, value]) => {
              formData.append(key, value)
            })
            result = await axios({
              method: 'POST',
              url: `${ROOT_API}/forecast`,
              data: formData,
            })
          } catch (err) {
            reject(err)
          }
          if (result?.status === 200) {
            data = result.data
            createStorageTTL(cache_key, data, MEDIUM_TTL)
          }
        }
        resolve(data)
      } catch (err) {
        reject(err)
      }
    })()
  })
}
