import fs from 'fs/promises';
import path from 'path';
import { Method } from './consts';
import { MiddlewareOptions } from './types';
import { RouteTrieNode } from './trie';

export const pad = (n: number) => {
  return n < 10 ? '0' + n : n.toString();
};

export function defineProps(props: Partial<MiddlewareOptions>): MiddlewareOptions {
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

export function checkForDynamicOrCatchAll(curr: RouteTrieNode) {
  for (const [, child] of curr.children) {
    if (child.isDynamic) return child
    if (!child.isDynamic && child.isCatchAll) return child
  }

  return undefined
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
    .filter(Boolean) // <- esto descarta strings vacíos como ''
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
      throw new Error(`File ${filename} is not a valid controller.`);
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
