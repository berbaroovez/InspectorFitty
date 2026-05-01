/**
 * Minimal FIT binary scanner to correctly accumulate message types that
 * fit-file-parser drops (it does `obj[type] = msg` instead of pushing to array).
 *
 * We implement just enough of the FIT protocol to read all records and group
 * them by global message number, then look up field names from the profile.
 */

// Base type byte → { size in bytes, signed, isFloat, isString }
const BASE_TYPES: Record<number, { size: number; read: (view: DataView, offset: number, le: boolean) => number | string }> = {
  0x00: { size: 1, read: (v, o) => v.getUint8(o) },          // enum
  0x01: { size: 1, read: (v, o) => v.getInt8(o) },            // sint8
  0x02: { size: 1, read: (v, o) => v.getUint8(o) },           // uint8
  0x83: { size: 2, read: (v, o, le) => v.getInt16(o, le) },   // sint16
  0x84: { size: 2, read: (v, o, le) => v.getUint16(o, le) },  // uint16
  0x85: { size: 4, read: (v, o, le) => v.getInt32(o, le) },   // sint32
  0x86: { size: 4, read: (v, o, le) => v.getUint32(o, le) },  // uint32
  0x07: { size: 1, read: (v, o) => v.getUint8(o) },           // string (handled specially)
  0x88: { size: 4, read: (v, o, le) => v.getFloat32(o, le) }, // float32
  0x89: { size: 8, read: (v, o, le) => v.getFloat64(o, le) }, // float64
  0x0A: { size: 1, read: (v, o) => v.getUint8(o) },           // uint8z
  0x8B: { size: 2, read: (v, o, le) => v.getUint16(o, le) },  // uint16z
  0x8C: { size: 4, read: (v, o, le) => v.getUint32(o, le) },  // uint32z
  0x0D: { size: 1, read: (v, o) => v.getUint8(o) },           // byte
  0x8E: { size: 8, read: (v, o, le) => Number(v.getBigInt64(o, le)) },  // sint64
  0x8F: { size: 8, read: (v, o, le) => Number(v.getBigUint64(o, le)) }, // uint64
  0x90: { size: 8, read: (v, o, le) => Number(v.getBigUint64(o, le)) }, // uint64z
}

// Global message number → message name (subset we care about)
const GLOBAL_MSG_NAMES: Record<number, string> = {
  0: 'file_id',
  1: 'capabilities',
  2: 'device_settings',
  3: 'user_profile',
  4: 'hrm_profile',
  5: 'sdm_profile',
  6: 'bike_profile',
  7: 'zones_target',
  8: 'hr_zone',
  9: 'power_zone',
  10: 'met_zone',
  12: 'sport',
  15: 'goal',
  18: 'session',
  19: 'lap',
  20: 'record',
  21: 'event',
  23: 'device_info',
  26: 'workout',
  27: 'workout_step',
  30: 'weight_scale',
  31: 'course',
  32: 'course_point',
  33: 'totals',
  34: 'activity',
  35: 'software',
  37: 'file_capabilities',
  38: 'mesg_capabilities',
  39: 'field_capabilities',
  49: 'file_creator',
  51: 'blood_pressure',
  53: 'speed_zone',
  55: 'monitoring',
  72: 'training_file',
  78: 'hrv',
  101: 'length',
  103: 'monitoring_info',
  148: 'slave_device',
  158: 'workout_session',
  160: 'watchface_settings',
  161: 'gps_metadata',
  162: 'camera_event',
  164: 'timestamp_correlation',
  167: 'gyroscope_data',
  168: 'accelerometer_data',
  169: 'three_d_sensor_calibration',
  174: 'video_frame',
  177: 'obdii_data',
  178: 'nmea_sentence',
  184: 'aviation_attitude',
  200: 'video',
  201: 'video_title',
  202: 'video_description',
  203: 'video_clip',
  206: 'developer_data_id',
  207: 'developer_data',
  227: 'climb_pro',
  258: 'split',
  259: 'split_summary',
  285: 'jump',
  312: 'tank_update',
  313: 'tank_summary',
  375: 'dive_gas',
  414: 'time_in_zone',
  415: 'activity_metrics',
}

interface FieldDef {
  fieldNum: number
  size: number
  baseType: number
}

interface MsgDef {
  globalNum: number
  littleEndian: boolean
  fields: FieldDef[]
  devFields: { fieldNum: number; size: number }[]
}

/**
 * Scan a FIT binary and return a map of messageName → array of parsed messages.
 * Only returns message types that fit-file-parser handles via its `default` case
 * (i.e., types not explicitly handled that get overwritten).
 *
 * Pass `targetTypes` to limit which global message numbers to accumulate.
 */
export function scanFitMessages(
  buffer: ArrayBuffer,
  targetGlobalNums: Set<number>,
): Record<string, Record<string, unknown>[]> {
  const bytes = new Uint8Array(buffer)
  const view = new DataView(buffer)

  const headerSize = bytes[0]
  const dataLength = view.getUint32(4, true)
  const crcStart = headerSize + dataLength

  const localMsgDefs = new Map<number, MsgDef>()
  const result: Record<string, Record<string, unknown>[]> = {}

  // Inline profile for fields we care about (subset — add more as needed)
  // Maps globalMsgNum → Map<fieldNum, fieldName>
  const FIELD_NAMES: Record<number, Record<number, string>> = {
    27: { 254: 'message_index', 0: 'wkt_step_name', 1: 'duration_type', 2: 'duration_value', 3: 'target_type', 4: 'target_value', 5: 'custom_target_value_low', 6: 'custom_target_value_high', 7: 'intensity' },
    26: { 254: 'message_index', 4: 'sport', 5: 'capabilities', 6: 'num_valid_steps', 8: 'wkt_name', 11: 'pool_length', 12: 'pool_length_unit', 14: 'sub_sport' },
    49: { 0: 'software_version', 1: 'hardware_version' },
  }

  // Enum lookups for readable values
  const ENUMS: Record<string, Record<number, string>> = {
    intensity: { 0: 'active', 1: 'rest', 2: 'warmup', 3: 'cooldown', 254: 'invalid' },
    duration_type: { 0: 'time', 1: 'distance', 2: 'hr_less_than', 3: 'hr_greater_than', 4: 'calories', 5: 'open', 6: 'repeat_until_steps_cmplt', 7: 'repeat_until_time', 8: 'repeat_until_distance', 9: 'repeat_until_calories', 10: 'repeat_until_hr_less_than', 11: 'repeat_until_hr_greater_than', 12: 'repeat_until_power_less_than', 13: 'repeat_until_power_greater_than', 14: 'power_less_than', 15: 'power_greater_than', 28: 'training_peaks_tss', 29: 'repeat_until_power_last_lap_less_than', 30: 'repeat_until_max_power_last_lap_less_than', 31: 'power_3s_less_than', 32: 'power_10s_less_than', 33: 'power_30s_less_than', 34: 'power_3s_greater_than', 35: 'power_10s_greater_than', 36: 'power_30s_greater_than', 37: 'power_lap_less_than', 38: 'power_lap_greater_than', 39: 'repeat_until_training_peaks_tss', 40: 'repetition_time', 41: 'reps', 255: 'invalid' },
    target_type: { 0: 'speed', 1: 'heart_rate', 2: 'open', 3: 'cadence', 4: 'power', 5: 'grade', 6: 'resistance', 7: 'power_3s_avg', 8: 'power_10s_avg', 9: 'power_30s_avg', 10: 'power_lap_avg', 11: 'power_last_lap_avg', 12: 'power_work', 13: 'heart_rate_lap_avg', 14: 'swim_stroke', 15: 'speed_lap_avg', 16: 'pace_lap_avg', 17: 'pace_last_lap_avg', 18: 'power_percent_ftp', 19: 'percent_ftp', 21: 'reps', 22: 'max_heart_rate_percent' },
  }

  let i = headerSize
  while (i < crcStart) {
    const recordHeader = bytes[i]
    i++

    const isCompressed = (recordHeader & 0x80) !== 0

    if (isCompressed) {
      const localNum = (recordHeader & 0x60) >> 5
      const def = localMsgDefs.get(localNum)
      if (def) {
        const msgSize = def.fields.reduce((s, f) => s + f.size, 0) + def.devFields.reduce((s, f) => s + f.size, 0)
        if (targetGlobalNums.has(def.globalNum)) {
          // parse it (same as normal data message below)
        }
        i += msgSize
      }
      continue
    }

    const isDefinition = (recordHeader & 0x40) !== 0
    const isDevData = (recordHeader & 0x20) !== 0
    const localNum = recordHeader & 0x0F

    if (isDefinition) {
      i++ // reserved
      const arch = bytes[i++]
      const littleEndian = arch === 0
      const globalNum = view.getUint16(i, littleEndian)
      i += 2
      const numFields = bytes[i++]
      const fields: FieldDef[] = []
      for (let f = 0; f < numFields; f++) {
        const fieldNum = bytes[i++]
        const size = bytes[i++]
        const baseType = bytes[i++]
        fields.push({ fieldNum, size, baseType })
      }
      const devFields: { fieldNum: number; size: number }[] = []
      if (isDevData) {
        const numDevFields = bytes[i++]
        for (let f = 0; f < numDevFields; f++) {
          const fieldNum = bytes[i++]
          const size = bytes[i++]
          i++ // dev data index
          devFields.push({ fieldNum, size })
        }
      }
      localMsgDefs.set(localNum, { globalNum, littleEndian, fields, devFields })
    } else {
      // Data message
      const def = localMsgDefs.get(localNum)
      if (!def) { i++; continue }

      const msgSize = def.fields.reduce((s, f) => s + f.size, 0) + def.devFields.reduce((s, f) => s + f.size, 0)

      if (targetGlobalNums.has(def.globalNum)) {
        const msgName = GLOBAL_MSG_NAMES[def.globalNum] ?? `msg_${def.globalNum}`
        const fieldNames = FIELD_NAMES[def.globalNum] ?? {}
        const msg: Record<string, unknown> = {}
        let fieldOffset = i

        for (const fDef of def.fields) {
          const name = fieldNames[fDef.fieldNum] ?? `field_${fDef.fieldNum}`
          const bt = BASE_TYPES[fDef.baseType]

          if (fDef.baseType === 0x07) {
            // string
            const chars: number[] = []
            for (let s = 0; s < fDef.size; s++) {
              const c = bytes[fieldOffset + s]
              if (c !== 0) chars.push(c)
            }
            msg[name] = new TextDecoder().decode(new Uint8Array(chars)).trim()
          } else if (bt) {
            const raw = bt.read(view, fieldOffset, def.littleEndian)
            // Apply enum lookup if available
            const enumMap = ENUMS[name]
            msg[name] = enumMap ? (enumMap[raw as number] ?? raw) : raw
          } else {
            msg[name] = null
          }
          fieldOffset += fDef.size
        }

        if (!result[msgName]) result[msgName] = []
        result[msgName].push(msg)
      }

      i += msgSize
    }
  }

  return result
}
