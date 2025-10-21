import fs from 'fs/promises';
import path from 'path';
import { Method } from './consts';
import { MiddlewareOptions, TMethod } from './types';
import { RouteTrieNode } from './trie';
import { Controller } from './interfaces';
import { RequestWithPrototype } from './request';
import { ResponseWithPrototype } from './response';

export const pad = (n: number) => {
  return n < 10 ? '0' + n : n.toString();
};

export function defineMiddlewareProps(props: Partial<MiddlewareOptions>): MiddlewareOptions {
  let opts: MiddlewareOptions = {
    bubble: true,
    registerBefore: ""
  }

  if (props.bubble !== undefined)
    opts.bubble = props.bubble

  if (props.registerBefore !== undefined)
    opts.registerBefore = props.registerBefore

  return opts
}



// function run when no static routes are found in the same level
// finds a dynamic or catchall route in the same level
// priority: dynamic over catchall
//

export function checkForDynamicOrCatchAll(curr: RouteTrieNode) {

}

export const createFakeRoute = (segment: string) => {
  const fakeRoute: RouteTrieNode = {
    isCatchAll: false,
    isDynamic: false,
    segment,
    children: new Map(),
    controllers: new Map(),
    hasControllers: false,
    middlewares: new Array()
  }

  return fakeRoute
}
// creates a fake controller to be injected into a Route.controllers[]
// accepts the method of the controller and the main function of the
// controller
export const createDummyController = (method: TMethod, functionBody: (req?: RequestWithPrototype, res?: ResponseWithPrototype) => { status: number, data: object | string }) => {
  const handler: Controller['handler'] = async (req, res) => functionBody(req, res)
  return { method, handler }
}

export const createDynamicFakeRoute = async (segment: string) => {
  const fakeRoute: RouteTrieNode = {
    isCatchAll: false,
    isDynamic: true,
    segment,
    children: new Map(),
    controllers: new Map(),
    hasControllers: false,
    middlewares: new Array()
  }

  return fakeRoute
}

export const createCatchAllFakeRoute = async (segment: string) => {
  const fakeRoute: RouteTrieNode = {
    isCatchAll: true,
    isDynamic: false,
    segment,
    children: new Map(),
    controllers: new Map(),
    hasControllers: false,
    middlewares: new Array()
  }

  return fakeRoute
}

export const getRoutesInsideDirectory = async (folderPath: string) => {
  try {

    let files = await fs.readdir(folderPath)
    const folders: string[] = []

    for (const file of files) {

      const currFilePath = path.join(folderPath, file)
      const currFileStats = await fs.stat(currFilePath)
      if (currFileStats.isDirectory()) {
        folders.push(file)
      }
    }

    return folders

  } catch (err: any) {
    throw new Error(`Error reading routes inside directory ${folderPath}`)

  }
}

export const getControllerFilesForRoute = async (segments: string[]) => {
  try {
    const absoluteRoutePath = path.resolve("src/routes", ...segments)

    let files = await fs.readdir(absoluteRoutePath)
    let controllers: string[] = []

    for (const file of files) {
      const currFilePath = path.join(absoluteRoutePath, file)
      const currFileStats = await fs.stat(currFilePath)

      if (!currFileStats.isDirectory()) {
        controllers.push(file)
      }
    }

    return controllers
  } catch (err) {
    throw new Error(`Error reading controllers in route ${segments}`)
  }
}


export const transformPathIntoSegments = (rawPath: string) =>
  rawPath
    .split(path.sep)
    .filter(Boolean)
    .map((segment) => {
      if (segment.includes('[') && segment.includes(']') && !segment.includes("...")) {
        return segment.replace('[', ':').replace(']', '');
      } else if (segment.includes("...")) {
        return segment.replace('[', '').replace(']', '');
      }
      return segment;
    });

export const fileIsController = async (filePath: string) => {
  try {

    const filename = path.basename(filePath).split('.')[0].trim().toUpperCase();
    const stat = await fs.stat(filePath);
    if (stat.isDirectory()) {
      return;
    }

    if (!Method.includes(filename as (typeof Method)[number])) {
      return false;
    }

    return true;
  } catch (err) {
    throw err
  }
};

export const joinSegments = (segments: string[]) => segments.map((segment) => {
  try {
    if (segment.includes(":")) {
      let newSegment = segment.replace(":", "[")
      let st = newSegment.split('')
      st.push(']')
      return st.join("")
    } else if (segment.includes('...')) {
      let st = segment.split("")
      st.push(']')
      st.unshift('[')
      return st.join("")
    }
    return segment

  } catch (err) {
    throw new Error("Error joining segments")
  }
})
