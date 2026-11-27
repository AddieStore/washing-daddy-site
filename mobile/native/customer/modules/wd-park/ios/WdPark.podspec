Pod::Spec.new do |s|
  s.name           = 'WdPark'
  s.version        = '1.0.0'
  s.summary        = 'Parking alerts (iOS stub)'
  s.description    = 'Parking alerts (iOS stub: iOS cannot see car Bluetooth in the background)'
  s.license        = 'MIT'
  s.author         = 'Washing Daddy'
  s.homepage       = 'https://washingdaddy.in'
  s.platforms      = { :ios => '16.4' }
  s.swift_version  = '5.9'
  s.source         = { git: '' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.pod_target_xcconfig = { 'DEFINES_MODULE' => 'YES', 'SWIFT_COMPILATION_MODE' => 'wholemodule' }
  s.source_files = "**/*.{h,m,swift}"
end
