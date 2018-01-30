(function() {
  Array.prototype.diff = function(a) {
    return {
      "rm": this.filter(i => a.indexOf(i) < 0),
      "add": a.filter(i => this.indexOf(i) < 0)
    }
  }

  let classConverter = _ => {
    let sa = _.split(':')
    return {
      state: sa[0],
      action: sa[1]
    }
  }

  let initElement = el => {
    el.className.split(" ")
      .map(classConverter)
      .forEach(sa => sharp.actions.addAction(el, sa))
      listenElement(el)
  }

  let listenElement = el => {
    if (!el.sharp) el.sharp = {}

    if (!el.sharp.observed) {
      console.log('OBSERVE: ', el)
      el.sharp.observed = true
      classObserver.observe(el, {
        attributes: true, 
        attributeFilter: ['class'],
        attributeOldValue: true
      })
    }
  }

  //---------------------------------------------------------------------------------------//
  let bodyObserver = new MutationObserver(mutations => {
    mutations.forEach(mut => {
      if (mut.type == "childList") {
        mut.addedNodes
          .forEach(node => {
            if (node instanceof HTMLElement) {
              //ON-ELEMENT CREATE...
              initElement(node)
            }
          })
        
        //mut.removedNodes.forEach(node => console.log(node))
      }
    })
  })

  let classObserver = new MutationObserver(mutations => {
    mutations.forEach(mut => {
      if (mut.attributeName == "class") {
        let oldClasses = mut.oldValue.split(" ")
        let newClasses = mut.target.className.split(" ")
        let diff = oldClasses.diff(newClasses)

        //ON-CLASS ADD...
        diff['add']
          .filter(_ => _.indexOf(':') != -1)
          .map(classConverter)
          .forEach(sa => sharp.actions.addAction(mut.target, sa))

        //ON-CLASS REMOVE...
        diff['rm']
          .filter(_ => _.indexOf(':') > 0)
          .map(classConverter)
          .forEach(sa => sharp.actions.removeAction(mut.target, sa))
      }
    })
  })

  //---------------------------------------------------------------------------------------//
  class SharpActions {
    constructor() {
      this.actions = {}
    }

    install(action, actFunc) {
      console.log(`  Action: ${action}`)
      this.actions[action] = actFunc

      return this
    }

    addAction(el, sa) {
      let event = sharp.states[sa.state]
      let actFunc = this.actions[sa.action]
      if (event && actFunc) {
        if (!el.sharp) el.sharp = {}

        el.sharp[sa.action] = (evt) => {
          console.log(`ACT -> ${sa.state}:${sa.action}`)
          let sharpEl = new SharpElements(evt.target)
          actFunc(sharpEl)
        }

        console.log(`ADD-ACTION: (id=${el.id}, state=${sa.state}, action=${sa.action})`)
        el.addEventListener(event, el.sharp[sa.action])
      }

      return this
    }

    removeAction(el, sa) {
      let event = sharp.states[sa.state]
      let actFunc = this.actions[sa.action]
      if (event && actFunc) {
        el.removeEventListener(event, el.sharp[sa.action])
        delete el.sharp[sa.action]
        console.log(`RM-ACTION: (id=${el.id}, state=${sa.state}, action=${sa.action})`)
      }

      return this
    }
  }

  let parser = new DOMParser()

  class SharpElements {
    constructor(els) {
      if (els instanceof NodeList)
        this.els = els
      else if (els instanceof HTMLElement)
        this.els = [els]
    }

    state() {
      if (this.els.length === 1)
        return this.els[0].sharp
      
      let _state = []
      this.els.forEach(el => _state.push(el.sharp))
      return _state
    }

    init() {
      this.els.forEach(el => initElement(el))
      return this
    }

    listen() {
      this.els.forEach(el => listenElement(el))
      return this
    }

    append(html) {
      this.els.forEach(el => {
        //FIX: Modifying innerHTML will destroy and rebuild all descendant elements of the container.
        el.innerHTML += html
      })
      return this
    }

    addClass(clazz) {
      this.els.forEach(el => el.classList.add(clazz))
      return this
    }

    removeClass(clazz) {
      this.els.forEach(el => el.classList.remove(clazz))
      return this
    }
  }

  let readyFuncs = []

  sharp = function(sel) {
    let res = document.querySelectorAll(sel)
    return new SharpElements(res)
  }

  sharp.states = { click: 'click', hover: 'mouseover', focus: 'focus' }
  sharp.actions = new SharpActions()

  sharp.ready = function(func) {
    readyFuncs.push(func)
  }

  function load() {
    console.log("---sharp-css---")
    bodyObserver.observe(document.body, {
      childList: true,
      subtree: true
    })
    
    console.log("Install Actions: ")
    readyFuncs.forEach(func => func())

    console.log("---sharp-listen---")
    sharp('[class*=":"]').init()
  }

  document.addEventListener('DOMContentLoaded', load, false)
})()