sharp.ready(_ => {
  sharp.actions
    .install('alert', el => alert('test-action'))
    .install('text-red', el => el.addClass('text-red'))
})
