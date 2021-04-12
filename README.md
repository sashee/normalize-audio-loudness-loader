# WebPack loader to normalize audio loudness according to ebuR128

It requires ffmpeg to be installed

## Install

```
npm i normalize-audio-loudness-loader
```

## Use

In the WebPack config, add the loader for the audio files you want normalized:

```
{
  test: /\.mp3$/,
  use: [
    {
      loader: require.resolve('file-loader'),
    },
    {
      loader: "normalize-audio-loudness-loader",
      options: {
        targetLoudness: -14,
      }
    },
  ],
},
```

Note that the loader gets an audio file and outputs the wav directly without emitting files. **It is intended to be used with other loaders** that write the audio and emit it. (such as the file-loader)

## Configuration

You can set 3 values:

* ```targetLoudness```: The target loudness (default: -23)
* ```lra```: Loudness range (default: 7)
* ```tp```: True peak (default: -2)
