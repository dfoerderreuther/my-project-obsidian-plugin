import {
  addIcon,
  App,
  ItemView,
  Modal,
  Notice,
  Plugin,
  Setting,
  TFile,
  TFolder,
  WorkspaceLeaf,
  normalizePath,
} from "obsidian";
import * as fs from "fs";
import * as path from "path";

const VIEW_TYPE = "my-project-panel";

// Key in terminal plugin's data.json for the macOS integrated shell profile
const TERMINAL_PROFILE = "darwinIntegratedDefault";
// View type registered by polyipseity/obsidian-terminal
const TERMINAL_VIEW_TYPE = "terminal:terminal";

// Ant Design icon keys (see ANT_ICONS) per file extension
const FILE_ICONS: Record<string, string> = {
  ".pdf":     "filePdf",
  ".docx":    "fileWord",  ".doc":     "fileWord",
  ".xlsx":    "fileExcel", ".xls":     "fileExcel",
  ".pptx":    "filePpt",   ".ppt":     "filePpt",
  ".md":      "fileText",
  ".png":     "fileImage", ".jpg":     "fileImage", ".jpeg": "fileImage",
  ".gif":     "fileImage", ".svg":     "fileImage", ".webp": "fileImage",
  ".mp4":     "video",     ".mov":     "video",     ".avi":  "video",
  ".mp3":     "sound",     ".wav":     "sound",
  ".zip":     "fileZip",   ".rar":     "fileZip",
  ".key":     "filePpt",
  ".numbers": "fileExcel",
  ".pages":   "fileWord",
};

// Color accent per extension group (CSS class suffix)
const FILE_COLOR: Record<string, string> = {
  ".pdf":     "red",
  ".docx":    "blue",   ".doc":     "blue",  ".pages": "blue",
  ".xlsx":    "green",  ".xls":     "green", ".numbers": "green",
  ".pptx":    "orange", ".ppt":     "orange", ".key":   "orange",
  ".png":     "purple", ".jpg":     "purple", ".jpeg":  "purple",
  ".gif":     "purple", ".svg":     "purple", ".webp":  "purple",
  ".mp4":     "purple", ".mov":     "purple",
  ".mp3":     "purple", ".wav":     "purple",
};

// Ant Design icons (https://ant.design/components/icon) — path data from @ant-design/icons-svg
const ANT_ICONS: Record<string, { vb: string; paths: string[] }> = {
  reload: { vb: "64 64 896 896", paths: ["M909.1 209.3l-56.4 44.1C775.8 155.1 656.2 92 521.9 92 290 92 102.3 279.5 102 511.5 101.7 743.7 289.8 932 521.9 932c181.3 0 335.8-115 394.6-276.1 1.5-4.2-.7-8.9-4.9-10.3l-56.7-19.5a8 8 0 00-10.1 4.8c-1.8 5-3.8 10-5.9 14.9-17.3 41-42.1 77.8-73.7 109.4A344.77 344.77 0 01655.9 829c-42.3 17.9-87.4 27-133.8 27-46.5 0-91.5-9.1-133.8-27A341.5 341.5 0 01279 755.2a342.16 342.16 0 01-73.7-109.4c-17.9-42.4-27-87.4-27-133.9s9.1-91.5 27-133.9c17.3-41 42.1-77.8 73.7-109.4 31.6-31.6 68.4-56.4 109.3-73.8 42.3-17.9 87.4-27 133.8-27 46.5 0 91.5 9.1 133.8 27a341.5 341.5 0 01109.3 73.8c9.9 9.9 19.2 20.4 27.8 31.4l-60.2 47a8 8 0 003 14.1l175.6 43c5 1.2 9.9-2.6 9.9-7.7l.8-180.9c-.1-6.6-7.8-10.3-13-6.2z"] },
  setting: { vb: "64 64 896 896", paths: ["M924.8 625.7l-65.5-56c3.1-19 4.7-38.4 4.7-57.8s-1.6-38.8-4.7-57.8l65.5-56a32.03 32.03 0 009.3-35.2l-.9-2.6a443.74 443.74 0 00-79.7-137.9l-1.8-2.1a32.12 32.12 0 00-35.1-9.5l-81.3 28.9c-30-24.6-63.5-44-99.7-57.6l-15.7-85a32.05 32.05 0 00-25.8-25.7l-2.7-.5c-52.1-9.4-106.9-9.4-159 0l-2.7.5a32.05 32.05 0 00-25.8 25.7l-15.8 85.4a351.86 351.86 0 00-99 57.4l-81.9-29.1a32 32 0 00-35.1 9.5l-1.8 2.1a446.02 446.02 0 00-79.7 137.9l-.9 2.6c-4.5 12.5-.8 26.5 9.3 35.2l66.3 56.6c-3.1 18.8-4.6 38-4.6 57.1 0 19.2 1.5 38.4 4.6 57.1L99 625.5a32.03 32.03 0 00-9.3 35.2l.9 2.6c18.1 50.4 44.9 96.9 79.7 137.9l1.8 2.1a32.12 32.12 0 0035.1 9.5l81.9-29.1c29.8 24.5 63.1 43.9 99 57.4l15.8 85.4a32.05 32.05 0 0025.8 25.7l2.7.5a449.4 449.4 0 00159 0l2.7-.5a32.05 32.05 0 0025.8-25.7l15.7-85a350 350 0 0099.7-57.6l81.3 28.9a32 32 0 0035.1-9.5l1.8-2.1c34.8-41.1 61.6-87.5 79.7-137.9l.9-2.6c4.5-12.3.8-26.3-9.3-35zM788.3 465.9c2.5 15.1 3.8 30.6 3.8 46.1s-1.3 31-3.8 46.1l-6.6 40.1 74.7 63.9a370.03 370.03 0 01-42.6 73.6L721 702.8l-31.4 25.8c-23.9 19.6-50.5 35-79.3 45.8l-38.1 14.3-17.9 97a377.5 377.5 0 01-85 0l-17.9-97.2-37.8-14.5c-28.5-10.8-55-26.2-78.7-45.7l-31.4-25.9-93.4 33.2c-17-22.9-31.2-47.6-42.6-73.6l75.5-64.5-6.5-40c-2.4-14.9-3.7-30.3-3.7-45.5 0-15.3 1.2-30.6 3.7-45.5l6.5-40-75.5-64.5c11.3-26.1 25.6-50.7 42.6-73.6l93.4 33.2 31.4-25.9c23.7-19.5 50.2-34.9 78.7-45.7l37.9-14.3 17.9-97.2c28.1-3.2 56.8-3.2 85 0l17.9 97 38.1 14.3c28.7 10.8 55.4 26.2 79.3 45.8l31.4 25.8 92.8-32.9c17 22.9 31.2 47.6 42.6 73.6L781.8 426l6.5 39.9zM512 326c-97.2 0-176 78.8-176 176s78.8 176 176 176 176-78.8 176-176-78.8-176-176-176zm79.2 255.2A111.6 111.6 0 01512 614c-29.9 0-58-11.7-79.2-32.8A111.6 111.6 0 01400 502c0-29.9 11.7-58 32.8-79.2C454 401.6 482.1 390 512 390c29.9 0 58 11.6 79.2 32.8A111.6 111.6 0 01624 502c0 29.9-11.7 58-32.8 79.2z"] },
  caretRight: { vb: "0 0 1024 1024", paths: ["M715.8 493.5L335 165.1c-14.2-12.2-35-1.2-35 18.5v656.8c0 19.7 20.8 30.7 35 18.5l380.8-328.4c10.9-9.4 10.9-27.6 0-37z"] },
  file: { vb: "64 64 896 896", paths: ["M854.6 288.6L639.4 73.4c-6-6-14.1-9.4-22.6-9.4H192c-17.7 0-32 14.3-32 32v832c0 17.7 14.3 32 32 32h640c17.7 0 32-14.3 32-32V311.3c0-8.5-3.4-16.7-9.4-22.7zM790.2 326H602V137.8L790.2 326zm1.8 562H232V136h302v216a42 42 0 0042 42h216v494z"] },
  fileText: { vb: "64 64 896 896", paths: ["M854.6 288.6L639.4 73.4c-6-6-14.1-9.4-22.6-9.4H192c-17.7 0-32 14.3-32 32v832c0 17.7 14.3 32 32 32h640c17.7 0 32-14.3 32-32V311.3c0-8.5-3.4-16.7-9.4-22.7zM790.2 326H602V137.8L790.2 326zm1.8 562H232V136h302v216a42 42 0 0042 42h216v494zM504 618H320c-4.4 0-8 3.6-8 8v48c0 4.4 3.6 8 8 8h184c4.4 0 8-3.6 8-8v-48c0-4.4-3.6-8-8-8zM312 490v48c0 4.4 3.6 8 8 8h384c4.4 0 8-3.6 8-8v-48c0-4.4-3.6-8-8-8H320c-4.4 0-8 3.6-8 8z"] },
  fileExcel: { vb: "64 64 896 896", paths: ["M854.6 288.6L639.4 73.4c-6-6-14.1-9.4-22.6-9.4H192c-17.7 0-32 14.3-32 32v832c0 17.7 14.3 32 32 32h640c17.7 0 32-14.3 32-32V311.3c0-8.5-3.4-16.7-9.4-22.7zM790.2 326H602V137.8L790.2 326zm1.8 562H232V136h302v216a42 42 0 0042 42h216v494zM514.1 580.1l-61.8-102.4c-2.2-3.6-6.1-5.8-10.3-5.8h-38.4c-2.3 0-4.5.6-6.4 1.9-5.6 3.5-7.3 10.9-3.7 16.6l82.3 130.4-83.4 132.8a12.04 12.04 0 0010.2 18.4h34.5c4.2 0 8-2.2 10.2-5.7L510 664.8l62.3 101.4c2.2 3.6 6.1 5.7 10.2 5.7H620c2.3 0 4.5-.7 6.5-1.9 5.6-3.6 7.2-11 3.6-16.6l-84-130.4 85.3-132.5a12.04 12.04 0 00-10.1-18.5h-35.7c-4.2 0-8.1 2.2-10.3 5.8l-61.2 102.3z"] },
  filePpt: { vb: "64 64 896 896", paths: ["M424 476c-4.4 0-8 3.6-8 8v276c0 4.4 3.6 8 8 8h32.5c4.4 0 8-3.6 8-8v-95.5h63.3c59.4 0 96.2-38.9 96.2-94.1 0-54.5-36.3-94.3-96-94.3H424zm150.6 94.3c0 43.4-26.5 54.3-71.2 54.3h-38.9V516.2h56.2c33.8 0 53.9 19.7 53.9 54.1zm280-281.7L639.4 73.4c-6-6-14.1-9.4-22.6-9.4H192c-17.7 0-32 14.3-32 32v832c0 17.7 14.3 32 32 32h640c17.7 0 32-14.3 32-32V311.3c0-8.5-3.4-16.7-9.4-22.7zM790.2 326H602V137.8L790.2 326zm1.8 562H232V136h302v216a42 42 0 0042 42h216v494z"] },
  fileImage: { vb: "64 64 896 896", paths: ["M553.1 509.1l-77.8 99.2-41.1-52.4a8 8 0 00-12.6 0l-99.8 127.2a7.98 7.98 0 006.3 12.9H696c6.7 0 10.4-7.7 6.3-12.9l-136.5-174a8.1 8.1 0 00-12.7 0zM360 442a40 40 0 1080 0 40 40 0 10-80 0zm494.6-153.4L639.4 73.4c-6-6-14.1-9.4-22.6-9.4H192c-17.7 0-32 14.3-32 32v832c0 17.7 14.3 32 32 32h640c17.7 0 32-14.3 32-32V311.3c0-8.5-3.4-16.7-9.4-22.7zM790.2 326H602V137.8L790.2 326zm1.8 562H232V136h302v216a42 42 0 0042 42h216v494z"] },
  fileWord: { vb: "64 64 896 896", paths: ["M854.6 288.6L639.4 73.4c-6-6-14.1-9.4-22.6-9.4H192c-17.7 0-32 14.3-32 32v832c0 17.7 14.3 32 32 32h640c17.7 0 32-14.3 32-32V311.3c0-8.5-3.4-16.7-9.4-22.7zM790.2 326H602V137.8L790.2 326zm1.8 562H232V136h302v216a42 42 0 0042 42h216v494zM528.1 472h-32.2c-5.5 0-10.3 3.7-11.6 9.1L434.6 680l-46.1-198.7c-1.3-5.4-6.1-9.3-11.7-9.3h-35.4a12.02 12.02 0 00-11.6 15.1l74.2 276c1.4 5.2 6.2 8.9 11.6 8.9h32c5.4 0 10.2-3.6 11.6-8.9l52.8-197 52.8 197c1.4 5.2 6.2 8.9 11.6 8.9h31.8c5.4 0 10.2-3.6 11.6-8.9l74.4-276a12.04 12.04 0 00-11.6-15.1H647c-5.6 0-10.4 3.9-11.7 9.3l-45.8 199.1-49.8-199.3c-1.3-5.4-6.1-9.1-11.6-9.1z"] },
  filePdf: { vb: "64 64 896 896", paths: ["M531.3 574.4l.3-1.4c5.8-23.9 13.1-53.7 7.4-80.7-3.8-21.3-19.5-29.6-32.9-30.2-15.8-.7-29.9 8.3-33.4 21.4-6.6 24-.7 56.8 10.1 98.6-13.6 32.4-35.3 79.5-51.2 107.5-29.6 15.3-69.3 38.9-75.2 68.7-1.2 5.5.2 12.5 3.5 18.8 3.7 7 9.6 12.4 16.5 15 3 1.1 6.6 2 10.8 2 17.6 0 46.1-14.2 84.1-79.4 5.8-1.9 11.8-3.9 17.6-5.9 27.2-9.2 55.4-18.8 80.9-23.1 28.2 15.1 60.3 24.8 82.1 24.8 21.6 0 30.1-12.8 33.3-20.5 5.6-13.5 2.9-30.5-6.2-39.6-13.2-13-45.3-16.4-95.3-10.2-24.6-15-40.7-35.4-52.4-65.8zM421.6 726.3c-13.9 20.2-24.4 30.3-30.1 34.7 6.7-12.3 19.8-25.3 30.1-34.7zm87.6-235.5c5.2 8.9 4.5 35.8.5 49.4-4.9-19.9-5.6-48.1-2.7-51.4.8.1 1.5.7 2.2 2zm-1.6 120.5c10.7 18.5 24.2 34.4 39.1 46.2-21.6 4.9-41.3 13-58.9 20.2-4.2 1.7-8.3 3.4-12.3 5 13.3-24.1 24.4-51.4 32.1-71.4zm155.6 65.5c.1.2.2.5-.4.9h-.2l-.2.3c-.8.5-9 5.3-44.3-8.6 40.6-1.9 45 7.3 45.1 7.4zm191.4-388.2L639.4 73.4c-6-6-14.1-9.4-22.6-9.4H192c-17.7 0-32 14.3-32 32v832c0 17.7 14.3 32 32 32h640c17.7 0 32-14.3 32-32V311.3c0-8.5-3.4-16.7-9.4-22.7zM790.2 326H602V137.8L790.2 326zm1.8 562H232V136h302v216a42 42 0 0042 42h216v494z"] },
  fileZip: { vb: "64 64 896 896", paths: ["M296 392h64v64h-64zm0 190v160h128V582h-64v-62h-64v62zm80 48v64h-32v-64h32zm-16-302h64v64h-64zm-64-64h64v64h-64zm64 192h64v64h-64zm0-256h64v64h-64zm494.6 88.6L639.4 73.4c-6-6-14.1-9.4-22.6-9.4H192c-17.7 0-32 14.3-32 32v832c0 17.7 14.3 32 32 32h640c17.7 0 32-14.3 32-32V311.3c0-8.5-3.4-16.7-9.4-22.7zM790.2 326H602V137.8L790.2 326zm1.8 562H232V136h64v64h64v-64h174v216a42 42 0 0042 42h216v494z"] },
  video: { vb: "64 64 896 896", paths: ["M912 302.3L784 376V224c0-35.3-28.7-64-64-64H128c-35.3 0-64 28.7-64 64v576c0 35.3 28.7 64 64 64h592c35.3 0 64-28.7 64-64V648l128 73.7c21.3 12.3 48-3.1 48-27.6V330c0-24.6-26.7-40-48-27.7zM712 792H136V232h576v560zm176-167l-104-59.8V458.9L888 399v226zM208 360h112c4.4 0 8-3.6 8-8v-48c0-4.4-3.6-8-8-8H208c-4.4 0-8 3.6-8 8v48c0 4.4 3.6 8 8 8z"] },
  sound: { vb: "64 64 896 896", paths: ["M625.9 115c-5.9 0-11.9 1.6-17.4 5.3L254 352H90c-8.8 0-16 7.2-16 16v288c0 8.8 7.2 16 16 16h164l354.5 231.7c5.5 3.6 11.6 5.3 17.4 5.3 16.7 0 32.1-13.3 32.1-32.1V147.1c0-18.8-15.4-32.1-32.1-32.1zM586 803L293.4 611.7l-18-11.7H146V424h129.4l17.9-11.7L586 221v582zm348-327H806c-8.8 0-16 7.2-16 16v40c0 8.8 7.2 16 16 16h128c8.8 0 16-7.2 16-16v-40c0-8.8-7.2-16-16-16zm-41.9 261.8l-110.3-63.7a15.9 15.9 0 00-21.7 5.9l-19.9 34.5c-4.4 7.6-1.8 17.4 5.8 21.8L856.3 800a15.9 15.9 0 0021.7-5.9l19.9-34.5c4.4-7.6 1.7-17.4-5.8-21.8zM760 344a15.9 15.9 0 0021.7 5.9L892 286.2c7.6-4.4 10.2-14.2 5.8-21.8L878 230a15.9 15.9 0 00-21.7-5.9L746 287.8a15.99 15.99 0 00-5.8 21.8L760 344z"] },
  folder: { vb: "64 64 896 896", paths: ["M880 298.4H521L403.7 186.2a8.15 8.15 0 00-5.5-2.2H144c-17.7 0-32 14.3-32 32v592c0 17.7 14.3 32 32 32h736c17.7 0 32-14.3 32-32V330.4c0-17.7-14.3-32-32-32zM840 768H184V256h188.5l119.6 114.4H840V768z"] },
  folderOpen: { vb: "64 64 896 896", paths: ["M928 444H820V330.4c0-17.7-14.3-32-32-32H473L355.7 186.2a8.15 8.15 0 00-5.5-2.2H96c-17.7 0-32 14.3-32 32v592c0 17.7 14.3 32 32 32h698c13 0 24.8-7.9 29.7-20l134-332c1.5-3.8 2.3-7.9 2.3-12 0-17.7-14.3-32-32-32zM136 256h188.5l119.6 114.4H748V444H238c-13 0-24.8 7.9-29.7 20L136 643.2V256zm635.3 512H159l103.3-256h612.4L771.3 768z"] },
  folderAdd: { vb: "64 64 896 896", paths: ["M484 443.1V528h-84.5c-4.1 0-7.5 3.1-7.5 7v42c0 3.8 3.4 7 7.5 7H484v84.9c0 3.9 3.2 7.1 7 7.1h42c3.9 0 7-3.2 7-7.1V584h84.5c4.1 0 7.5-3.2 7.5-7v-42c0-3.9-3.4-7-7.5-7H540v-84.9c0-3.9-3.1-7.1-7-7.1h-42c-3.8 0-7 3.2-7 7.1zm396-144.7H521L403.7 186.2a8.15 8.15 0 00-5.5-2.2H144c-17.7 0-32 14.3-32 32v592c0 17.7 14.3 32 32 32h736c17.7 0 32-14.3 32-32V330.4c0-17.7-14.3-32-32-32zM840 768H184V256h188.5l119.6 114.4H840V768z"] },
  close: { vb: "64 64 896 896", paths: ["M799.86 166.31c.02 0 .04.02.08.06l57.69 57.7c.04.03.05.05.06.08a.12.12 0 010 .06c0 .03-.02.05-.06.09L569.93 512l287.7 287.7c.04.04.05.06.06.09a.12.12 0 010 .07c0 .02-.02.04-.06.08l-57.7 57.69c-.03.04-.05.05-.07.06a.12.12 0 01-.07 0c-.03 0-.05-.02-.09-.06L512 569.93l-287.7 287.7c-.04.04-.06.05-.09.06a.12.12 0 01-.07 0c-.02 0-.04-.02-.08-.06l-57.69-57.7c-.04-.03-.05-.05-.06-.07a.12.12 0 010-.07c0-.03.02-.05.06-.09L454.07 512l-287.7-287.7c-.04-.04-.05-.06-.06-.09a.12.12 0 010-.07c0-.02.02-.04.06-.08l57.7-57.69c.03-.04.05-.05.07-.06a.12.12 0 01.07 0c.03 0 .05.02.09.06L512 454.07l287.7-287.7c.04-.04.06-.05.09-.06a.12.12 0 01.07 0z"] },
  thunderbolt: { vb: "64 64 896 896", paths: ["M848 359.3H627.7L825.8 109c4.1-5.3.4-13-6.3-13H436c-2.8 0-5.5 1.5-6.9 4L170 547.5c-3.1 5.3.7 12 6.9 12h174.4l-89.4 357.6c-1.9 7.8 7.5 13.3 13.3 7.7L853.5 373c5.2-4.9 1.7-13.7-5.5-13.7zM378.2 732.5l60.3-241H281.1l189.6-327.4h224.6L487 427.4h211L378.2 732.5z"] },
  cloud: { vb: "64 64 896 896", paths: ["M811.4 418.7C765.6 297.9 648.9 212 512.2 212S258.8 297.8 213 418.6C127.3 441.1 64 519.1 64 612c0 110.5 89.5 200 199.9 200h496.2C870.5 812 960 722.5 960 612c0-92.7-63.1-170.7-148.6-193.3zm36.3 281a123.07 123.07 0 01-87.6 36.3H263.9c-33.1 0-64.2-12.9-87.6-36.3A123.3 123.3 0 01140 612c0-28 9.1-54.3 26.2-76.3a125.7 125.7 0 0166.1-43.7l37.9-9.9 13.9-36.6c8.6-22.8 20.6-44.1 35.7-63.4a245.6 245.6 0 0152.4-49.9c41.1-28.9 89.5-44.2 140-44.2s98.9 15.3 140 44.2c19.9 14 37.5 30.8 52.4 49.9 15.1 19.3 27.1 40.7 35.7 63.4l13.8 36.5 37.8 10c54.3 14.5 92.1 63.8 92.1 120 0 33.1-12.9 64.3-36.3 87.7z"] },
  project: { vb: "64 64 896 896", paths: ["M280 752h80c4.4 0 8-3.6 8-8V280c0-4.4-3.6-8-8-8h-80c-4.4 0-8 3.6-8 8v464c0 4.4 3.6 8 8 8zm192-280h80c4.4 0 8-3.6 8-8V280c0-4.4-3.6-8-8-8h-80c-4.4 0-8 3.6-8 8v184c0 4.4 3.6 8 8 8zm192 72h80c4.4 0 8-3.6 8-8V280c0-4.4-3.6-8-8-8h-80c-4.4 0-8 3.6-8 8v256c0 4.4 3.6 8 8 8zm216-432H144c-17.7 0-32 14.3-32 32v736c0 17.7 14.3 32 32 32h736c17.7 0 32-14.3 32-32V144c0-17.7-14.3-32-32-32zm-40 728H184V184h656v656z"] },
};

// Render an Ant Design icon into an element as an inline <svg fill="currentColor">.
function setAntIcon(el: HTMLElement, key: string) {
  const def = ANT_ICONS[key] ?? ANT_ICONS.file;
  el.empty();
  const ns  = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", def.vb);
  svg.setAttribute("fill", "currentColor");
  svg.addClass("svg-icon");
  for (const d of def.paths) {
    const p = document.createElementNS(ns, "path");
    p.setAttribute("d", d);
    svg.appendChild(p);
  }
  el.appendChild(svg);
}

// Build inner SVG for Obsidian's addIcon() — scales the 64..960 viewBox into 0..100.
function antIconBody(key: string): string {
  const def = ANT_ICONS[key] ?? ANT_ICONS.file;
  const [minX, minY, w] = def.vb.split(" ").map(Number);
  const s = 100 / w;
  const paths = def.paths.map((d) => `<path d="${d}" />`).join("");
  return `<g fill="currentColor" transform="scale(${s}) translate(${-minX},${-minY})">${paths}</g>`;
}

interface ElectronDialog {
  showOpenDialog(opts: {
    properties: string[];
  }): Promise<{ canceled: boolean; filePaths: string[] }>;
}

interface ProjectFrontmatter {
  title?: string;
  workfront?: string;
  read_paths?: string[];
  write_paths?: string[];
}

interface WorkfrontData {
  activityType?: string;
}

export default class MyProjectPlugin extends Plugin {
  async onload() {
    // Register Ant Design "project" icon for ribbon + view tab
    addIcon("my-project", antIconBody("project"));

    this.registerView(VIEW_TYPE, (leaf) => new ProjectPanelView(leaf, this));

    this.addRibbonIcon("my-project", "My Project Panel", () => {
      this.activateView();
    });

    this.addCommand({
      id: "open-project-panel",
      name: "Open project panel",
      callback: () => this.activateView(),
    });

    // Status bar button — always visible
    const sb = this.addStatusBarItem();
    sb.addClass("mpp-statusbar");
    const sbIcon = sb.createSpan({ cls: "mpp-statusbar-icon" });
    setAntIcon(sbIcon, "project");
    sb.createSpan({ text: "Project" });
    sb.addEventListener("click", () => this.activateView());

    // Right-click a folder in Obsidian's file explorer → create/edit project
    this.registerEvent(
      this.app.workspace.on("file-menu", (menu, file) => {
        if (!(file instanceof TFolder)) return;
        const existing = file.children.find(
          (f): f is TFile => f instanceof TFile && f.name === "_PROJECT.md",
        ) ?? null;
        menu.addItem((item) =>
          item
            .setTitle(existing ? "Edit project" : "Create project")
            .setIcon("my-project")
            .onClick(() => this.openProjectModal(file, existing)),
        );
      }),
    );
  }

  // Open the settings modal for a folder, then reveal + load the project panel.
  private openProjectModal(folder: TFolder, existing: TFile | null) {
    const data = existing
      ? (this.app.metadataCache.getFileCache(existing)?.frontmatter as ProjectFrontmatter | undefined ?? null)
      : null;
    new ProjectSettingsModal(this.app, existing, folder, data, async (saved: TFile) => {
      // Wait for metadata cache to reflect the new frontmatter.
      await new Promise<void>((res) => {
        const ref = this.app.metadataCache.on("changed", (f) => {
          if (f.path === saved.path) { this.app.metadataCache.offref(ref); res(); }
        });
        window.setTimeout(() => { this.app.metadataCache.offref(ref); res(); }, 800);
      });
      await this.activateView();
      const view = this.app.workspace.getLeavesOfType(VIEW_TYPE)[0]?.view;
      if (view instanceof ProjectPanelView) await view.showProject(saved);
    }).open();
  }

  async onunload() {
    this.app.workspace.detachLeavesOfType(VIEW_TYPE);
  }

  async activateView() {
    const { workspace } = this.app;
    const leaves = workspace.getLeavesOfType(VIEW_TYPE);
    if (!leaves.length) {
      const leaf = workspace.getRightLeaf(false);
      if (!leaf) return;
      await leaf.setViewState({ type: VIEW_TYPE, active: true });
    }
    workspace.revealLeaf(workspace.getLeavesOfType(VIEW_TYPE)[0]);
  }
}

class ProjectPanelView extends ItemView {
  private plugin: MyProjectPlugin;
  private projectDir: string | null = null;
  private vaultRelDir: string | null = null;
  private projectData: ProjectFrontmatter | null = null;
  private wfData: WorkfrontData | null = null;
  private currentProjectFile: TFile | null = null; // tracks which _PROJECT.md is displayed
  private activeTabLabel: string | null = null;    // remembered tab across reloads

  constructor(leaf: WorkspaceLeaf, plugin: MyProjectPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType(): string { return VIEW_TYPE; }
  getDisplayText(): string { return this.projectData?.title ?? "Project"; }
  getIcon(): string { return "my-project"; }

  async onOpen() {
    this.registerEvent(
      this.app.workspace.on("active-leaf-change", (leaf) => {
        if (leaf?.view.getViewType() === VIEW_TYPE) return;
        this.refresh();
      })
    );
    this.registerEvent(
      this.app.vault.on("modify", (file) => {
        if (file instanceof TFile &&
            (file.name === "_PROJECT.md" || file.name === "_WORKFRONT-SUMMARY.md")) {
          this.refresh(true); // force re-render even if same project
        }
      })
    );
    await this.refresh(true);
  }

  private async refresh(force = false) {
    const file = this.app.workspace.getActiveFile();

    // No active markdown file — keep whatever is already displayed
    if (!file) return;

    const projectFile = this.findProjectFile(
      file.parent instanceof TFolder ? file.parent : null
    );

    // Active file has no project — keep current panel (e.g. switched to terminal)
    if (!projectFile) return;

    // Same project already showing and not a forced refresh — nothing to do
    if (!force && projectFile.path === this.currentProjectFile?.path) return;

    await this.loadProjectFile(projectFile);
  }

  // Public: force-show a specific project (used by the file-explorer menu).
  async showProject(projectFile: TFile) {
    this.currentProjectFile = null;
    await this.loadProjectFile(projectFile);
  }

  // Render directly from a specific _PROJECT.md, ignoring the active file.
  private async loadProjectFile(projectFile: TFile) {
    const cache = this.app.metadataCache.getFileCache(projectFile);
    const frontmatter = cache?.frontmatter as ProjectFrontmatter | undefined;
    if (!frontmatter?.title) { this.renderEmpty("_PROJECT.md missing frontmatter"); return; }

    const vaultBasePath = (this.app.vault.adapter as { basePath: string }).basePath;
    this.currentProjectFile = projectFile;
    this.projectDir         = path.join(vaultBasePath, projectFile.parent!.path);
    this.vaultRelDir        = projectFile.parent!.path;
    this.projectData        = frontmatter;
    this.wfData             = await this.loadWorkfrontData(projectFile.parent!);

    this.renderProject();
  }

  // All _PROJECT.md across the vault, with a title, sorted by title.
  private getAllProjects(): { file: TFile; title: string }[] {
    return this.app.vault.getMarkdownFiles()
      .filter((f) => f.name === "_PROJECT.md")
      .map((f) => {
        const fm = this.app.metadataCache.getFileCache(f)?.frontmatter as ProjectFrontmatter | undefined;
        return { file: f, title: fm?.title?.trim() || f.parent?.name || f.path };
      })
      .filter((p) => p.title)
      .sort((a, b) => a.title.localeCompare(b.title));
  }

  private findProjectFile(folder: TFolder | null): TFile | null {
    if (!folder) return null;
    const found = folder.children.find(
      (f): f is TFile => f instanceof TFile && f.name === "_PROJECT.md"
    );
    if (found) return found;
    return this.findProjectFile(folder.parent instanceof TFolder ? folder.parent : null);
  }

  private async loadWorkfrontData(folder: TFolder): Promise<WorkfrontData | null> {
    const wfFile = folder.children.find(
      (f): f is TFile => f instanceof TFile && f.name === "_WORKFRONT-SUMMARY.md"
    );
    if (!wfFile) return null;
    try {
      const content = await this.app.vault.read(wfFile);
      // Targeted extraction — avoids table parsing edge cases
      const m = content.match(/\|\s*Activity Type\s*\|\s*([^|\r\n]+)/);
      const activityType = m?.[1]?.trim();
      if (!activityType) return null;
      return { activityType };
    } catch {
      return null;
    }
  }

  private renderEmpty(msg: string) {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.className = "mpp";
    contentEl.createEl("p", { text: msg, cls: "mpp-empty" });
  }

  private renderProject() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.className = "mpp";

    if (!this.projectData || !this.projectDir || !this.vaultRelDir) return;
    const { title, workfront, read_paths, write_paths } = this.projectData;

    // ── Fixed top region (header, activity, action buttons) ──────────────
    const fixed = contentEl.createDiv("mpp-fixed");

    const header = fixed.createDiv("mpp-header");

    // Project switcher — all _PROJECT.md in the vault, by title
    const projects = this.getAllProjects();
    if (projects.length > 1) {
      const sel = header.createEl("select", { cls: "mpp-project-select dropdown" });
      for (const p of projects) {
        const opt = sel.createEl("option", { text: p.title, value: p.file.path });
        if (p.file.path === this.currentProjectFile?.path) opt.selected = true;
      }
      sel.addEventListener("change", () => {
        const target = projects.find((p) => p.file.path === sel.value);
        if (!target) return;
        this.currentProjectFile = null;
        void this.loadProjectFile(target.file);
      });
    } else {
      header.createEl("h2", { text: title ?? "Project", cls: "mpp-title" });
    }

    const reload = header.createDiv({ cls: "mpp-gear", attr: { title: "Reload panel" } });
    setAntIcon(reload, "reload");
    reload.addEventListener("click", () => {
      if (this.currentProjectFile) void this.loadProjectFile(this.currentProjectFile);
    });
    const gear = header.createDiv({ cls: "mpp-gear", attr: { title: "Edit _PROJECT.md" } });
    setAntIcon(gear, "setting");
    gear.addEventListener("click", () => this.openSettings());

    // ── Workfront activity type ───────────────────────────────────────────
    if (this.wfData?.activityType) {
      const meta = fixed.createDiv("mpp-wf-meta");
      meta.createSpan({ text: this.wfData.activityType, cls: "mpp-wf-activity" });
    }

    // ── Actions ───────────────────────────────────────────────────────────
    const actions = fixed.createDiv("mpp-actions");

    const claudeBtn = actions.createEl("button", { cls: "mpp-btn-claude mod-cta" });
    setAntIcon(claudeBtn.createSpan({ cls: "mpp-btn-icon" }), "thunderbolt");
    claudeBtn.createSpan({ text: "Claude Code" });
    claudeBtn.addEventListener("click", () => this.openClaudeCode());

    if (workfront) {
      const wfUrl = workfront;
      const wfBtn = actions.createEl("button", { cls: "mpp-btn-wf" });
      setAntIcon(wfBtn.createSpan({ cls: "mpp-btn-icon" }), "cloud");
      wfBtn.createSpan({ text: "Workfront" });
      wfBtn.addEventListener("click", () => {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        (require("electron") as { shell: { openExternal: (url: string) => void } }).shell.openExternal(wfUrl);
      });
    }

    // Obsidian button — opens the project's vault folder in Finder
    if (this.projectDir) {
      const obsDir = this.projectDir;
      this.makeFinderButton(actions, "Obsidian", obsDir);
    }

    // ── Tabs: Notes, then writable (RW/W) paths, then read-only (R) ──────
    const reads  = (read_paths  ?? []).filter((p) => path.isAbsolute(p));
    const writes = (write_paths ?? []).filter((p) => path.isAbsolute(p));
    const ordered: string[] = [];
    for (const p of [...reads, ...writes]) if (!ordered.includes(p)) ordered.push(p);

    type Tab = {
      label: string; access?: string; fsPath: string;
      relDir: string | null; newestFirst: boolean; isNotes?: boolean;
    };
    const tabs: Tab[] = [{
      label: "Notes", fsPath: this.projectDir, relDir: this.vaultRelDir,
      newestFirst: true, isNotes: true,
    }];
    const pathTabs = ordered.map((p) => ({
      label: path.basename(p),
      access: (reads.includes(p) ? "R" : "") + (writes.includes(p) ? "W" : ""),
      fsPath: p, relDir: null, newestFirst: false,
    }));
    // Writable first (W in access), read-only last
    const rank = (a: string) => (a.includes("W") ? 0 : 1);
    pathTabs.sort((a, b) => rank(a.access) - rank(b.access) || a.label.localeCompare(b.label));
    tabs.push(...pathTabs);

    const tabBar = contentEl.createDiv("mpp-tabs");
    const body   = contentEl.createDiv("mpp-tab-body");

    const activeLabel =
      this.activeTabLabel && tabs.some((t) => t.label === this.activeTabLabel)
        ? this.activeTabLabel : tabs[0].label;

    const btns = new Map<string, HTMLElement>();
    const show = (label: string) => {
      this.activeTabLabel = label;
      for (const [l, b] of btns) b.toggleClass("is-active", l === label);
      body.empty();
      const tab = tabs.find((t) => t.label === label);
      if (tab) this.renderTabBody(body, tab);
    };

    for (const tab of tabs) {
      const btn = tabBar.createDiv({ cls: "mpp-tab", attr: { title: tab.fsPath } });
      btn.createSpan({ text: tab.label, cls: "mpp-tab-label" });
      if (tab.access) {
        btn.createSpan({
          text: tab.access,
          cls: `mpp-access mpp-access-${tab.access.toLowerCase()}`,
        });
      }
      btns.set(tab.label, btn);
      btn.addEventListener("click", () => show(tab.label));
    }

    show(activeLabel);
  }

  // ── Tab body — Finder bar + file tree (+ new-note row for Notes) ────────

  private renderTabBody(
    body: HTMLElement,
    tab: { label: string; fsPath: string; relDir: string | null; newestFirst: boolean; isNotes?: boolean },
  ) {
    const bar = body.createDiv("mpp-tab-bar");
    bar.createSpan({ text: tab.fsPath, cls: "mpp-tab-path", attr: { title: tab.fsPath } });
    const finder = bar.createDiv({ cls: "mpp-path-finder", attr: { title: "Open in Finder" } });
    setAntIcon(finder, "folderOpen");
    finder.addEventListener("click", () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      (require("electron") as { shell: { openPath: (p: string) => void } }).shell.openPath(tab.fsPath);
    });

    // Notes tab: new-note creator on top, above the file tree
    if (tab.isNotes) this.renderNewNoteRow(body);

    const tree = body.createDiv("nav-files-container");
    this.renderTree(tree, tab.fsPath, tab.relDir, tab.newestFirst);
  }

  // ── Settings modal — create / edit _PROJECT.md ─────────────────────────

  private openSettings() {
    // Target the current _PROJECT.md, or create one in the active file's folder.
    let file: TFile | null = this.currentProjectFile;
    let folder: TFolder | null = file?.parent instanceof TFolder ? file.parent : null;
    if (!file) {
      const active = this.app.workspace.getActiveFile();
      folder = active?.parent instanceof TFolder ? active.parent : null;
    }
    if (!file && !folder) {
      new Notice("Open a note in a project folder first");
      return;
    }
    new ProjectSettingsModal(this.app, file, folder, this.projectData, async (saved: TFile) => {
      // Wait for the metadata cache to reflect the new frontmatter, then reload.
      await new Promise<void>((res) => {
        const ref = this.app.metadataCache.on("changed", (f) => {
          if (f.path === saved.path) { this.app.metadataCache.offref(ref); res(); }
        });
        window.setTimeout(() => { this.app.metadataCache.offref(ref); res(); }, 800);
      });
      this.currentProjectFile = null; // force full reload even if same project
      await this.loadProjectFile(saved);
    }).open();
  }

  private makeFinderButton(container: HTMLElement, label: string, targetPath: string) {
    const btn  = container.createEl("button", { cls: "mpp-btn-wf" });
    setAntIcon(btn.createSpan({ cls: "mpp-btn-icon" }), "folderOpen");
    btn.createSpan({ text: label });
    btn.addEventListener("click", () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      (require("electron") as { shell: { openPath: (p: string) => void } }).shell.openPath(targetPath);
    });
  }

  // ── Unified native Obsidian tree ────────────────────────────────────────
  // relDir = vault-relative dir (md opens in Obsidian, rest external) or
  //          null (all entries open externally — SharePoint).

  private renderTree(
    container: HTMLElement,
    fsDir: string,
    relDir: string | null,
    newestFirst: boolean,
  ) {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(fsDir, { withFileTypes: true });
    } catch {
      container.createEl("p", { text: "Cannot read folder", cls: "mpp-empty" });
      return;
    }

    const dirs = entries
      .filter((e) => e.isDirectory() && !e.name.startsWith("."))
      .sort((a, b) => a.name.localeCompare(b.name));
    const files = entries
      .filter((e) => e.isFile() && !e.name.startsWith(".") && !e.name.startsWith("~$"))
      .sort((a, b) => newestFirst ? b.name.localeCompare(a.name) : a.name.localeCompare(b.name));

    for (const dir of dirs) {
      this.renderNavFolder(
        container, dir.name, path.join(fsDir, dir.name),
        relDir !== null ? relDir + "/" + dir.name : null, newestFirst,
      );
    }
    for (const file of files) {
      this.renderNavFile(
        container, file.name, path.join(fsDir, file.name),
        relDir !== null ? relDir + "/" + file.name : null,
      );
    }
    if (!dirs.length && !files.length) {
      container.createEl("p", { text: relDir !== null ? "No notes yet" : "Empty", cls: "mpp-empty" });
    }
  }

  private renderNavFolder(
    container: HTMLElement,
    name: string,
    fsPath: string,
    relPath: string | null,
    newestFirst: boolean,
  ) {
    // Native file-explorer markup: .tree-item.nav-folder > .tree-item-self.nav-folder-title
    const folderEl = container.createDiv({ cls: "tree-item nav-folder is-collapsed" });
    const titleEl  = folderEl.createDiv({
      cls: "tree-item-self nav-folder-title is-clickable mod-collapsible",
    });
    const collapseEl = titleEl.createDiv({
      cls: "tree-item-icon collapse-icon nav-folder-collapse-indicator is-collapsed",
    });
    setAntIcon(collapseEl, "caretRight"); // rotates 90° when expanded (CSS)
    titleEl.createDiv({ cls: "tree-item-inner nav-folder-title-content", text: name });

    let childrenEl: HTMLElement | null = null;
    let collapsed = true;

    titleEl.addEventListener("click", () => {
      collapsed = !collapsed;
      folderEl.toggleClass("is-collapsed", collapsed);
      collapseEl.toggleClass("is-collapsed", collapsed); // rotates the triangle
      if (!collapsed) {
        if (!childrenEl) {
          childrenEl = folderEl.createDiv({ cls: "tree-item-children nav-folder-children" });
          this.renderTree(childrenEl, fsPath, relPath, newestFirst);
        }
      } else if (childrenEl) {
        childrenEl.remove(); // Obsidian removes children DOM when collapsing
        childrenEl = null;
      }
    });
  }

  private renderNavFile(
    container: HTMLElement,
    name: string,
    fsPath: string,
    relPath: string | null,
  ) {
    const ext      = path.extname(name).toLowerCase();
    const baseName = name.slice(0, -ext.length) || name;
    const iconName = FILE_ICONS[ext] ?? "file";
    const color    = FILE_COLOR[ext] ?? "";

    // Native markup: .tree-item.nav-file > .tree-item-self.nav-file-title
    const fileEl  = container.createDiv({ cls: "tree-item nav-file" });
    const titleEl = fileEl.createDiv({ cls: "tree-item-self nav-file-title is-clickable" });

    const iconEl = titleEl.createDiv({
      cls: `nav-file-icon${color ? " mpp-icon-" + color : ""}`,
    });
    setAntIcon(iconEl, iconName);

    titleEl.createDiv({ cls: "tree-item-inner nav-file-title-content", text: baseName });

    if (ext) {
      titleEl.createDiv({ text: ext.slice(1), cls: "nav-file-tag" });
    }

    // md inside the vault → open in Obsidian; everything else → default app
    const openInVault = relPath !== null && ext === ".md";

    titleEl.addEventListener("click", () => {
      if (openInVault) {
        const vFile = this.app.vault.getAbstractFileByPath(normalizePath(relPath!));
        if (vFile instanceof TFile) {
          this.app.workspace.getLeaf().openFile(vFile);
        }
      } else {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        (require("electron") as { shell: { openPath: (p: string) => void } }).shell.openPath(fsPath);
      }
    });
  }

  // ── New note creator ──────────────────────────────────────────────────

  private renderNewNoteRow(container: HTMLElement) {
    const today = new Date().toISOString().slice(0, 10); // yyyy-mm-dd
    const row   = container.createDiv("mpp-new-note");

    const input = row.createEl("input", { cls: "mpp-new-note-input" });
    input.type        = "text";
    input.value       = today + " ";
    input.placeholder = "yyyy-mm-dd note title";

    const btn = row.createEl("button", {
      text: "Create",
      cls: "mpp-new-note-btn",
    });

    const create = async () => {
      if (!this.vaultRelDir) return;
      let name = input.value.trim();
      if (!name) return;
      if (!name.endsWith(".md")) name += ".md";
      const relPath = normalizePath(this.vaultRelDir + "/" + name);

      let vFile = this.app.vault.getAbstractFileByPath(relPath) as TFile | null;
      if (!vFile) {
        vFile = await this.app.vault.create(relPath, "") as TFile;
      }
      await this.app.workspace.getLeaf().openFile(vFile);
      await this.refresh();
    };

    btn.addEventListener("click", create);
    input.addEventListener("keydown", (e) => { if (e.key === "Enter") create(); });

    // Focus end of input on click so cursor is after the date prefix
    input.addEventListener("focus", () => {
      const len = input.value.length;
      input.setSelectionRange(len, len);
    });
  }

  // ── Claude Code ──────────────────────────────────────────────────────

  private loadTerminalProfile(): Record<string, unknown> | null {
    try {
      const vaultBase = (this.app.vault.adapter as { basePath: string }).basePath;
      const dataPath  = path.join(vaultBase, ".obsidian", "plugins", "terminal", "data.json");
      const data      = JSON.parse(fs.readFileSync(dataPath, "utf-8")) as {
        profiles?: Record<string, Record<string, unknown>>;
      };
      return data.profiles?.[TERMINAL_PROFILE] ?? null;
    } catch {
      return null;
    }
  }

  private async openClaudeCode() {
    if (!this.projectDir) return;

    const termPlugin = (this.app as { plugins: { plugins: Record<string, unknown> } })
      .plugins.plugins["terminal"];
    if (!termPlugin) {
      new Notice("polyipseity/obsidian-terminal not installed");
      return;
    }

    // Load the profile object (not a string key!) and override args to auto-launch claude.
    // Prepend ~/.local/bin (where `claude` lives) to PATH so it's found in the login shell.
    // After claude exits, exec a new interactive login zsh to keep the terminal alive.
    const base    = this.loadTerminalProfile();
    // OSC 0 escape sets the terminal title — xterm.js fires onTitleChange which the plugin uses to update the tab header.
    const title   = (this.projectData?.title ?? "Project").replace(/'/g, "");
    const cmd     = `export PATH=$HOME/.local/bin:$PATH; printf '\\e]0;${title}\\a'; claude --permission-mode auto; exec zsh -l`;
    const profile = base
      ? { ...base, args: ["-l", "-c", cmd] }
      : { type: "integrated", executable: "/bin/zsh", args: ["-l", "-c", cmd] };

    const leaf = this.app.workspace.getLeaf("split", "horizontal");
    try {
      await leaf.setViewState({
        type: TERMINAL_VIEW_TYPE,
        active: true,
        state: {
          [TERMINAL_VIEW_TYPE]: {
            profile,
            cwd: this.projectDir,
            serial: Date.now(),
          },
        },
      });
      this.app.workspace.revealLeaf(leaf);

      // Rename the tab — poll until the tab header element exists, then set text directly.
      // The terminal plugin regenerates the title from the PTY hostname; we override after.
      const tabTitle = (this.projectData?.title ?? "Project");
      void (async () => {
        for (let i = 0; i < 30; i++) {
          await sleep(100);
          const el = (leaf as unknown as { tabHeaderInnerTitleEl?: HTMLElement }).tabHeaderInnerTitleEl;
          if (el) { el.textContent = tabTitle; break; }
        }
      })();
    } catch (e) {
      new Notice(`Failed to open terminal: ${e}`);
      console.error("[my-project-panel]", e);
    }
  }
}

// ── _PROJECT.md create / edit modal ───────────────────────────────────────

class ProjectSettingsModal extends Modal {
  private file: TFile | null;
  private folder: TFolder | null;
  private data: ProjectFrontmatter;
  private onSaved: (file: TFile) => Promise<void> | void;

  constructor(
    app: App,
    file: TFile | null,
    folder: TFolder | null,
    data: ProjectFrontmatter | null,
    onSaved: (file: TFile) => Promise<void> | void,
  ) {
    super(app);
    this.file    = file;
    this.folder  = folder;
    this.data    = { ...(data ?? {}) };
    this.onSaved = onSaved;
  }

  onOpen() {
    const { contentEl } = this;
    this.modalEl.addClass("mpp-settings-modal");
    contentEl.empty();
    contentEl.createEl("h3", { text: this.file ? "Edit project" : "New project" });

    let title = this.data.title ?? "";
    let wf     = this.data.workfront ?? "";
    const readPaths  = [...(this.data.read_paths  ?? [])];
    const writePaths = [...(this.data.write_paths ?? [])];

    new Setting(contentEl)
      .setName("Title")
      .addText((t) => t.setValue(title).onChange((v) => (title = v)));

    new Setting(contentEl)
      .setName("Workfront URL")
      .addText((t) => t.setValue(wf).onChange((v) => (wf = v)));

    this.buildPathField(contentEl, "Read paths", readPaths);
    this.buildPathField(contentEl, "Write paths", writePaths);

    new Setting(contentEl)
      .addButton((b) => b.setButtonText("Cancel").onClick(() => this.close()))
      .addButton((b) =>
        b.setButtonText("Save").setCta().onClick(async () => {
          const t = title.trim();
          if (!t) { new Notice("Title is required"); return; }
          await this.save({
            title: t,
            workfront: wf.trim() || undefined,
            read_paths: readPaths,
            write_paths: writePaths,
          });
          this.close();
        }),
      );
  }

  private buildPathField(container: HTMLElement, name: string, list: string[]) {
    const field = container.createDiv("mpp-path-field");
    const head  = field.createDiv("mpp-path-head");
    head.createSpan({ text: name, cls: "mpp-path-name" });
    const addBtn = head.createEl("button", { cls: "mpp-path-add" });
    setAntIcon(addBtn.createSpan(), "folderAdd");
    addBtn.createSpan({ text: "Add folder" });

    const listEl = field.createDiv("mpp-path-list");

    const render = () => {
      listEl.empty();
      if (!list.length) {
        listEl.createDiv({ text: "No folders selected", cls: "mpp-path-empty" });
        return;
      }
      list.forEach((p, i) => {
        const row = listEl.createDiv("mpp-path-row");
        const ic  = row.createSpan("mpp-path-icon");
        setAntIcon(ic, "folder");
        row.createSpan({ text: path.basename(p), cls: "mpp-path-base" });
        row.createSpan({ text: p, cls: "mpp-path-full", attr: { title: p } });
        const rm = row.createSpan({ cls: "mpp-path-remove", attr: { title: "Remove" } });
        setAntIcon(rm, "close");
        rm.addEventListener("click", () => { list.splice(i, 1); render(); });
      });
    };

    addBtn.addEventListener("click", async () => {
      const picked = await this.pickFolders();
      let changed = false;
      for (const p of picked) if (!list.includes(p)) { list.push(p); changed = true; }
      if (changed) render();
    });

    render();
  }

  private async pickFolders(): Promise<string[]> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const electron = require("electron") as { remote?: { dialog: ElectronDialog } };
      const dialog: ElectronDialog =
        electron.remote?.dialog ??
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        (require("@electron/remote") as { dialog: ElectronDialog }).dialog;
      const res = await dialog.showOpenDialog({
        properties: ["openDirectory", "multiSelections"],
      });
      if (res.canceled) return [];
      return res.filePaths ?? [];
    } catch (e) {
      new Notice(`Folder picker unavailable: ${e}`);
      return [];
    }
  }

  private async save(data: ProjectFrontmatter) {
    let file = this.file;
    if (!file) {
      if (!this.folder) { new Notice("No target folder"); return; }
      const relPath = normalizePath(this.folder.path + "/_PROJECT.md");
      file = await this.app.vault.create(relPath, "");
    }
    await this.app.fileManager.processFrontMatter(file, (fm) => {
      fm.title       = data.title;
      if (data.workfront) fm.workfront = data.workfront; else delete fm.workfront;
      fm.read_paths  = data.read_paths  ?? [];
      fm.write_paths = data.write_paths ?? [];
    });

    this.writeClaudeSettings(file, data);
    this.writeClaudeMd(file, data);

    new Notice("_PROJECT.md saved");
    await this.onSaved(file);
  }

  // Write/refresh CLAUDE.md routing guidance in a managed block (preserves
  // any user-authored content outside the markers).
  private writeClaudeMd(projectFile: TFile, data: ProjectFrontmatter) {
    try {
      const vaultBase = (this.app.vault.adapter as { basePath: string }).basePath;
      const projDir   = path.join(vaultBase, projectFile.parent!.path);

      const writes   = (data.write_paths ?? []).filter((p) => path.isAbsolute(p));
      const reads    = (data.read_paths  ?? []).filter((p) => path.isAbsolute(p));
      const readOnly = reads.filter((p) => !writes.includes(p));
      const firstWrite = writes[0];

      const START = "<!-- my-project:start -->";
      const END   = "<!-- my-project:end -->";

      const lines: string[] = [];
      lines.push(START);
      lines.push(`# ${data.title ?? "Project"}`);
      lines.push("");
      lines.push("Customer project. This file is auto-generated by the My Project Panel plugin — edit outside the markers only.");
      if (data.workfront) { lines.push(""); lines.push(`Workfront: ${data.workfront}`); }
      lines.push("");
      lines.push("## Locations");
      lines.push("");
      lines.push("| Purpose | Path |");
      lines.push("| --- | --- |");
      lines.push(`| Obsidian notes (this folder) | \`${projDir}\` |`);
      writes.forEach((p, i) =>
        lines.push(`| SharePoint — writable${writes.length > 1 ? ` #${i + 1}` : ""} | \`${p}\` |`));
      readOnly.forEach((p) => lines.push(`| Read-only reference | \`${p}\` |`));
      lines.push("");
      lines.push("## Where to write");
      lines.push("");
      if (firstWrite) {
        lines.push(`- "write to SharePoint", "save the file", "write file X", "export …", or any **document** (xlsx, pptx, docx, pdf) → write to the **first writable SharePoint copy**: \`${firstWrite}\``);
      } else {
        lines.push("- No writable SharePoint path configured — add one in the project settings to enable document writes.");
      }
      lines.push(`- "write a note", "summarize in X.md", "add to my notes", or any **Markdown note** → write to the **Obsidian notes folder**: \`${projDir}\``);
      lines.push("- Default: prose/notes go to Obsidian; deliverable documents go to the writable SharePoint copy.");
      lines.push("- Never write outside the paths allowed in `.claude/settings.json`.");
      lines.push(END);
      const block = lines.join("\n");

      const mdPath = path.join(projDir, "CLAUDE.md");
      let content = "";
      try { content = fs.readFileSync(mdPath, "utf-8"); } catch { /* new file */ }

      if (content.includes(START) && content.includes(END)) {
        const re = new RegExp(`${START}[\\s\\S]*?${END}`);
        content = content.replace(re, block);
      } else {
        content = content.trim() ? `${block}\n\n${content}` : `${block}\n`;
      }
      fs.writeFileSync(mdPath, content);
    } catch (e) {
      new Notice(`Could not write CLAUDE.md: ${e}`);
      console.error("[my-project-panel]", e);
    }
  }

  // Write .claude/settings.json next to _PROJECT.md with read/write permissions.
  private writeClaudeSettings(projectFile: TFile, data: ProjectFrontmatter) {
    try {
      const vaultBase = (this.app.vault.adapter as { basePath: string }).basePath;
      const projDir   = path.join(vaultBase, projectFile.parent!.path);

      const writes = (data.write_paths ?? []).filter((p) => path.isAbsolute(p));
      const reads  = (data.read_paths  ?? []).filter((p) => path.isAbsolute(p));
      // Read-only dirs (not also writable) need explicit access.
      const readOnly = reads.filter((p) => !writes.includes(p));

      // Edit/Write granted for the project dir + every writable path.
      const allow: string[] = [];
      for (const dir of [projDir, ...writes]) {
        allow.push(`Edit(/${dir}/**)`);
        allow.push(`Write(/${dir}/**)`);
      }

      const settings = {
        permissions: {
          defaultMode: "default",
          additionalDirectories: readOnly,
          allow,
          deny: [
            "Bash(rm:*)", "Bash(rmdir:*)", "Bash(mv:*)", "Bash(dd:*)",
            "Bash(sudo:*)", "Bash(git push:*)", "Bash(curl:*)", "Bash(wget:*)",
          ],
        },
      };

      const claudeDir = path.join(projDir, ".claude");
      fs.mkdirSync(claudeDir, { recursive: true });
      fs.writeFileSync(path.join(claudeDir, "settings.json"), JSON.stringify(settings, null, 2) + "\n");
    } catch (e) {
      new Notice(`Could not write .claude/settings.json: ${e}`);
      console.error("[my-project-panel]", e);
    }
  }

  onClose() { this.contentEl.empty(); }
}

