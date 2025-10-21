
// returns an array of controller names in the current route

import { Method } from "../consts";

export function isValidHttpMethodFile(file: string) {
  try {
    // get only the file name, without the extension                                          
    const indexOfLastDot = file.lastIndexOf('.');

    const method = file
      .slice(0, indexOfLastDot)
      .toUpperCase() as (typeof Method)[number];

    // file name must be a method name                                                        
    if (!Method.includes(method)) {
      return false
    }

    return true
  } catch (err) {
    throw err
  }

}

export function parseHttpMethod(fileName: string) {
  try {
    // get only the file name, without the extension                                          
    const indexOfLastDot = fileName.lastIndexOf('.');

    const method = fileName
      .slice(0, indexOfLastDot)
      .toUpperCase() as (typeof Method)[number];

    return method


  } catch (err: any) {
    throw err
  }
}
