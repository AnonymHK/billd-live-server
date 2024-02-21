// WARN 该文件只是方便我将当前项目复制一份到我电脑的另一个位置（gitee私有仓库的位置)，其他人不需要管这个文件~

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import trash from 'trash';

const allFile = [];
const ignore = ['.DS_Store', '.git', '.gitignore', 'node_modules', 'dist'];
const localDir =
  '/Users/huangshuisheng/Desktop/hss/galaxy-s10/billd-live-server';
const giteeDir = '/Users/huangshuisheng/Desktop/hss/jenkins/billd-live-server';

const dir = fs.readdirSync(localDir).filter((item) => {
  if (ignore.includes(item)) {
    return false;
  }
  return true;
});

function findFile(inputDir) {
  for (let i = 0; i < inputDir.length; i += 1) {
    const file = inputDir[i];
    const filePath = `${localDir}/${file}`;
    const stat = fs.statSync(filePath);
    const isDir = stat.isDirectory();
    if (!isDir) {
      allFile.push(filePath);
    } else {
      findFile(fs.readdirSync(filePath).map((key) => `${file}/${key}`));
    }
  }
}

function putFile() {
  for (let i = 0; i < allFile.length; i += 1) {
    const file = allFile[i];
    const arr = [];
    const githubFile = file.replace(localDir, '');
    const githubFileArr = githubFile.split('/').filter((item) => item !== '');
    githubFileArr.forEach((item) => {
      if (arr.length) {
        arr.push(path.resolve(arr[arr.length - 1], item));
      } else {
        arr.push(path.resolve(giteeDir, item));
      }
    });
    arr.forEach((item, index) => {
      // 数组的最后一个一定是文件，因此不需要判断它是不是目录
      if (index !== arr.length - 1) {
        const flag = fs.existsSync(item);
        // eslint-disable-next-line
        !flag && fs.mkdirSync(item);
      }
    });
    fs.copyFileSync(
      file,
      path.join(giteeDir, './', file.replace(localDir, ''))
    );
  }
}

async function clearOld() {
  const giteeDirAllFile = fs.readdirSync(giteeDir);
  const queue = [];
  giteeDirAllFile.forEach((url) => {
    const fullurl = `${giteeDir}/${url}`;
    if (!['node_modules', 'src', '.git'].includes(url)) {
      queue.push(trash(fullurl));
    }
  });
  await Promise.all(queue);
  const queue1 = [];
  const srcDir = path.resolve(giteeDir, './src');
  const giteeDirSrcAllFile = fs.readdirSync(srcDir);
  giteeDirSrcAllFile.forEach((url) => {
    const fullurl = `${srcDir}/${url}`;
    // if (!['secret'].includes(url)) {
    queue1.push(trash(fullurl));
    // }
  });
  await Promise.all(queue1);
}

clearOld().then(() => {
  findFile(dir);
  putFile();
  const gitignoreTxt =
    'node_modules\n.DS_Store\ndist\n/public/**/*\n/upload/**/*\n/webm/**/*\n!/public/README.md\n!/upload/README.md\n!/webm/README.md\n';
  fs.writeFileSync(path.resolve(giteeDir, './.gitignore'), gitignoreTxt);
  execSync(`pnpm i`, { cwd: giteeDir });
  execSync(`git add .`, { cwd: giteeDir });
  execSync(`git commit -m 'feat: ${new Date().toLocaleString()}'`, {
    cwd: giteeDir,
  });
  execSync(`git push`, { cwd: giteeDir });
});
