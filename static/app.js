// prototyping
// methodologies and practices not to be taken seriously nor to scale

import { createElement, render, Component, h } from 'https://unpkg.com/preact@latest?module';
import { useState, useEffect, useRef } from 'https://unpkg.com/preact@latest/hooks/dist/hooks.module.js?module';
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

    const apiEndpointField = useRef(null);

    const handlePickFolder = async () => {
        const localFolder = await skale.local.loadDirectory();
        setLocalFolder(localFolder);
    }

    const handleApiEndpoint = () => {
        skale.init(apiEndpointField.current.value);
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
            fetchRemoteFiles();
        }, 2000);

        return () => {
            clearInterval(interval);
        }
        
    }, [localFolder, localFiles]);

    // given local folder, traverse its files
    useEffect(async () => {
        if(!localFolder) return;

        const [ totalSize, files ] = await skale.local.traverseDirectoryFiles(localFolder);
        setLocalFolderSize(totalSize);
        setLocalFiles(files);

    }, [localFolder]);

    // set remote directory
    useEffect(async () => {
        if(!(localFolder && ethAddress && privateKey)) return;

        // assuming createDirectory implicitly doesnt dup
        const remoteDirPath = skale.fs && await skale.fs.createDirectory(ethAddress, localFolder.name, privateKey);
        remoteDirPath && setRemoteDirPath(remoteDirPath);

    }, [localFolder, ethAddress, privateKey]);

    // given remote dir path, pull directory listing
    useEffect(async () => {
        if(!remoteDirPath) return;
        
        fetchRemoteFiles();
        
    }, [remoteDirPath]);

    // given traversed files, upload them to remote
    // nightmarish blind uploads
    useEffect(async () => {
        if(!(localFiles && localFolderSize && remoteDirPath && skale.fs && ethAddress && privateKey)) return;
        
        try {
            skale.fs && await skale.fs.reserveSpace(ethAddress, ethAddress, localFolderSize, privateKey);
        } catch(e) {
            console.error("Failed to reserve space, continuing uploads anyways...", e);
        }
        localFiles.forEach(file => {
            // no need to await, paths are retrieved in dir fetch
            skale.fs.uploadFile(address, `${remoteDirPath}/${file.name}`, file.buffer, privateKey);
        });
    
    }, [localFiles, localFolderSize, remoteDirPath, ethAddress, privateKey]);

    return html`
    <div>
        <section class="controls">
            <input ref=${apiEndpointField} type="url" placeholder="Node API Endpoint"/>
            <button onClick="${handleApiEndpoint}">✔️</button>
            ...
            <input onInput=${(e) => setEthAddress(e.target.value)} type="text" placeholder="Ethereum Address" />
            <input onInput=${(e) => setPrivateKey(e.target.value)} type="password" placeholder="Private Key 🙈" autocomplete="off"/>
            ...
            <button onClick="${handlePickFolder}">Pick Folder</button>
        </section>
        ${
            localFolder && html`
            <section class="files">
            <p>🗀 ${localFolder.name} : ${remoteDirPath || "Remote not set (simulating)"}</p>
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