(function() {
  const form = document.getElementById('theme-editor-form')
  const inputs = form.querySelectorAll('input')
  const selects = form.querySelectorAll('select')
  const output = document.getElementById('theme-output')
  const downloadBtn = document.getElementById('download-theme')
  const bunnyFontsInput = document.getElementById('bunny-fonts')
  
  // Border-specific elements
  const borderWidthInput = document.getElementById('border-width')
  const borderStyleSelect = document.getElementById('border-style')
  const borderColorInput = document.getElementById('border-color')
  const borderOutput = document.getElementById('border')
  
  function initInputs() {
    inputs.forEach(input => {
      if (input.id === 'bunny-fonts' || input.id === 'border-width' || 
          input.id === 'border-color' || input.id === 'border') return
      
      const varName = input.dataset.var
      if (!varName) return
      
      const value = getComputedStyle(document.documentElement).getPropertyValue(varName).trim()
      
      if (input.type === 'color') {
        input.value = rgbToHex(value)
      } else {
        input.value = value
      }
      
      input.addEventListener('input', updateTheme)
    })
    
    selects.forEach(select => {
      select.addEventListener('change', updateTheme)
    })
    
    // Extract font name from existing heading font family
    const headingFont = getComputedStyle(document.documentElement).getPropertyValue('--font-family-heading').trim()
    const fontMatch = headingFont.match(/"([^"]+)"/i)
    if (fontMatch && fontMatch[1]) {
      // Default to space-grotesk with weights if we find it in the current font
      if (fontMatch[1].toLowerCase().includes('space grotesk')) {
        bunnyFontsInput.value = 'space-grotesk:400,500,600,700'
      }
    }
    
    // Set up border controls
    const currentBorder = getComputedStyle(document.documentElement).getPropertyValue('--border').trim()
    const borderParts = currentBorder.match(/(\d+\w+)\s+(\w+)\s+(.+)/)
    
    if (borderParts && borderParts.length === 4) {
      borderWidthInput.value = borderParts[1]
      borderStyleSelect.value = borderParts[2]
      if (borderParts[3].startsWith('#')) {
        borderColorInput.value = borderParts[3]
      } else if (borderParts[3].startsWith('rgb')) {
        borderColorInput.value = rgbToHex(borderParts[3])
      } else {
        // It's a variable like #{$gold}, we can't parse it easily
        // Just use the gold color as default
        borderColorInput.value = '#d4af37'
      }
    } else {
      // Default values
      borderWidthInput.value = '1px'
      borderStyleSelect.value = 'solid'
      borderColorInput.value = '#d4af37'
    }
    
    borderOutput.value = `${borderWidthInput.value} ${borderStyleSelect.value} ${borderColorInput.value}`
    
    // Add event listeners for border components
    borderWidthInput.addEventListener('input', updateBorder)
    borderStyleSelect.addEventListener('change', updateBorder)
    borderColorInput.addEventListener('input', updateBorder)
    
    bunnyFontsInput.addEventListener('input', updateTheme)
    
    updateTheme()
  }
  
  function updateBorder() {
    const borderValue = `${borderWidthInput.value} ${borderStyleSelect.value} ${borderColorInput.value}`
    borderOutput.value = borderValue
    document.documentElement.style.setProperty('--border', borderValue)
    updateTheme()
  }
  
  function rgbToHex(rgb) {
    if (rgb.startsWith('#')) return rgb
    
    const rgbValues = rgb.match(/\d+/g)
    if (!rgbValues || rgbValues.length < 3) return '#000000'
    
    const r = parseInt(rgbValues[0])
    const g = parseInt(rgbValues[1])
    const b = parseInt(rgbValues[2])
    
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)
  }
  
  function updateTheme() {
    let themeText = ''
    
    // Add Bunny Fonts import if specified
    const bunnyFonts = bunnyFontsInput.value.trim()
    if (bunnyFonts) {
      themeText += `@import url("https://fonts.bunny.net/css?family=${bunnyFonts}&display=swap");\n\n`
      
      // Update the live page with the font import
      const existingLinkEl = document.querySelector('link[data-bunny-fonts]')
      if (existingLinkEl) {
        existingLinkEl.href = `https://fonts.bunny.net/css?family=${bunnyFonts}&display=swap`
      } else {
        const linkEl = document.createElement('link')
        linkEl.rel = 'stylesheet'
        linkEl.href = `https://fonts.bunny.net/css?family=${bunnyFonts}&display=swap`
        linkEl.setAttribute('data-bunny-fonts', 'true')
        document.head.appendChild(linkEl)
      }
    }
    
    themeText += '$black: #000000;\n'
    themeText += '$charcoal: #0c0c14;\n'
    themeText += '$dark-gray: #171720;\n'
    themeText += '$medium-gray: #222230;\n'
    themeText += '$gold: #d4af37;\n'
    themeText += '$gold-light: #f8e9a1;\n'
    themeText += '$gold-dark: #9a7d0a;\n'
    themeText += '$platinum: #e5e4e2;\n'
    themeText += '$off-white: #f5f5f5;\n\n'
    
    themeText += ':root {\n'
    
    // Add border variable (specially handled)
    themeText += `  --border: ${borderOutput.value};\n`
    
    inputs.forEach(input => {
      const varName = input.dataset.var
      if (!varName || varName === '--border') return
      
      const value = input.value
      
      document.documentElement.style.setProperty(varName, value)
      themeText += `  ${varName}: ${value};\n`
    })
    
    themeText += '}\n'
    output.value = themeText
  }
  
  function downloadTheme() {
    const content = output.value
    const blob = new Blob([content], { type: 'text/css' })
    const url = URL.createObjectURL(blob)
    
    const a = document.createElement('a')
    a.href = url
    a.download = 'theme.scss'
    document.body.appendChild(a)
    a.click()
    
    setTimeout(() => {
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }, 100)
  }
  
  downloadBtn.addEventListener('click', downloadTheme)
  
  document.addEventListener('DOMContentLoaded', initInputs)
})()