// prototyping
// methodologies and practices not to be taken seriously nor to scale

import { createElement, render, Component, h } from 'https://unpkg.com/preact@latest?module';
import { useState, useEffect } from 'https://unpkg.com/preact@latest/hooks/dist/hooks.module.js?module';
import htm from 'https://unpkg.com/htm?module';
const html = htm.bind(h);

// smartish view component
const File = ({ local, remote = {} }) => {
    return html`<tr>
    <td class="file">🗎 ${local.name}</td>
    <td>${(local.size / 1024 / 1024).toFixed(3)} MB</td>
    <td>${remote.uploadingProgress || 0}%</td>
    </tr>`;
}

function App (props) {

    const [ethAddress, setEthAddress] = useState("");
    const [privateKey, setPrivateKey] = useState("");

    const [localFolderSize, setLocalFolderSize] = useState(0);
    const [localFolder, setLocalFolder] = useState(null);
    const [localFiles, setLocalFiles] = useState([]);

    const [remoteDirPath, setRemoteDirPath] = useState(null);
    const [remoteFiles, setRemoteFiles] = useState(new Map()); // file.name => file

    // shallow traverse a directory

    const handlePickFolder = async () => {
        const localFolder = await skale.local.loadDirectory();
        setLocalFolder(localFolder);
    }

    // fetch files inside remote directory
    const fetchRemoteFiles = async () => {
        if(!localFolder) return;
        let directoryList = skale.fs && await skale.fs.listDirectory(remoteDirPath);

        setRemoteFiles((remoteFiles) => {
            // mock fallback: simulated progress
            if(!directoryList) {
                directoryList = localFiles.map(file => {
                    const remoteFile = remoteFiles.get(file.name) || {};
                    if(remoteFile.uploadingProgress === 100)
                        return remoteFile;
                    let uploadingProgress = Number(((remoteFile.uploadingProgress || 0) + Math.random()).toFixed(2));
                    if(uploadingProgress > 100) {
                        uploadingProgress = 100;

                    }
                    return {
                        name: file.name,
                        uploadingProgress
                    }
                });
            }   

            // state update
            let fileMap = new Map(remoteFiles);
            directoryList.forEach(record => {
                fileMap.set(record.name, record);
            });
            return fileMap;
        });
    }

    // further granular file tracking can allow more engaged interval / status management
    // non-dependency on remoteDirPath here allows simulation
    useEffect(() => {
        if(!(localFolder && localFiles)) return;

        const interval = setInterval(() => {
            console.log("interval", localFolder);
            fetchRemoteFiles();
        }, 2000);

        return () => {
            clearInterval(interval);
        }
    }, [localFolder, localFiles]);

    // pre-load past dir path to state
    useEffect(() => {
        const path = localStorage.getItem("SKL-dir_path");
        path && setRemoteDirPath(path);
    }, []);

    // given remote dir path, pull directory listing
    useEffect(async () => {
        if(!remoteDirPath) return;
        fetchRemoteFiles();
    }, [remoteDirPath]);

    // given local folder, traverse its files
    useEffect(async () => {
        if(!localFolder) return;
        console.log(localFolder);
        localStorage.setItem("SKL-local_folder", localFolder.name);

        const remoteDirPath = skale.fs && await skale.fs.createDirectory(ethAddress, localFolder.name, privateKey);
        remoteDirPath && setRemoteDirPath(remoteDirPath);

        const [ totalSize, files ] = await skale.local.traverseDirectoryFiles(localFolder);
        setLocalFiles(files);

    }, [localFolder]);

    // given traversed files, upload them to remote
    useEffect(async () => {
        if(!(localFiles && localFolderSize && skale.fs)) return;
        skale.fs && skale.fs.reserveSpace(ethAddress, ethAddress, localFolderSize, privateKey);
        localFiles.forEach(file => {
            // no need to await, path is fetched in dir list
            skale.fs.uploadFile(address, `${remoteDirPath}/${file.name}`, file.buffer, privateKey);
        });
    }, [localFiles, localFolderSize, remoteDirPath]);

    return html`
    <div>
        <section class="controls">
            <input type="text" placeholder="Node API Endpoint"/>
            <button onClick="${handlePickFolder}">✔️</button>
            ...
            <input onInput=${(e) => setEthAddress(e.target.value)} type="text" placeholder="Ethereum Address" />
            <input onInput=${(e) => setPrivateKey(e.target.value)} type="password" placeholder="Private Key 🙈" autocomplete="off"/>
            ...
            <button onClick="${handlePickFolder}">Pick Folder</button>
        </section>
        ${
            localFolder && html`
            <section class="files">
            <p>🗀 ${localFolder.name} : ${remoteDirPath}</p>
            <table>
                <tr>
                    <th style="min-width: 60%">Name</th>
                    <th>Size</th>
                    <th>Sync %</th>
                </tr>
                <tbody>
                ${localFiles.map(
                    file => html`<${File} local=${file} remote=${remoteFiles.get(file.name)} />`
                )}
                </tbody>
            </table>
            </section>
            `
        }
    </div>
    `;
}

render(html`<${App} />`, document.getElementById("app"));