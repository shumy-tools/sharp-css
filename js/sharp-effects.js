sharp.ready(_ => {
  sharp.actions
    .install('alert', el => alert('test-action'))
})
