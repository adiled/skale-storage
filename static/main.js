console.log('globals', Web3, filestorage);

SKALE_RPC_PROVIDER = '';

window.skale = {
    w3: null,
    fs: null,
    init: (apiEndpoint) => {
        console.info("setting up instances");
        if(SKALE_RPC_PROVIDER) {
            const skaleProvider = new Web3.providers.HttpProvider(SKALE_RPC_PROVIDER);
            skale.w3 = new Web3(skaleProvider);
            skale.fs = new filestorage(skale.w3, true);
        } else if (apiEndpoint) {
            skale.fs = new filestorage(apiEndpoint);
        } else {
            throw { message: "Either set global SKALE_RPC_PROVIDER or pass an API endpoint" };
        }
    },
    local: {
        traverseDirectoryFiles: async function(dirHandle) {
            // console.log(dirHandle);
            let files = [];
            let totalSize = 0;
            for await (let fileLike of dirHandle) {
                if (fileLike[1].kind !== "file") continue;
    
                const file = await fileLike[1].getFile();
                const buffer = new Uint8Array(await file.arrayBuffer());
                files.push({
                    name: file.name,
                    lastModified: file.lastModified,
                    size: file.size,
                    type: file.type,
                    buffer
                });
                totalSize += file.size;
            }
            return [totalSize, files];
        },
        loadDirectory: async function() {
            const dirHandle = await window.showDirectoryPicker();
            console.log(dirHandle);
            return dirHandle;
        },
    }
}