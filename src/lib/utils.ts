import fs from 'fs';
import path from 'path';
import { Method } from './consts';

export const pad = (n: number) => {
  return n < 10 ? '0' + n : n.toString();
};

export const transformPathIntoSegments = (rawPath: string) =>

  rawPath.split(path.sep).map((segment) => {
    if (segment.includes('[') && segment.includes(']')) {
      return segment.replace('[', ':').replace(']', '');
    }
    return segment;
  });

export const fileIsController = (filePath: string) => {
  const filename = path.basename(filePath).split('.')[0].trim().toUpperCase();
  const stat = fs.statSync(filePath);
  if (stat.isDirectory()) {
    return;
  }
  if (!Method.includes(filename as (typeof Method)[number])) {
    throw new Error(`File ${filename} is not a valid controller.`);
  }

  return true;
};
