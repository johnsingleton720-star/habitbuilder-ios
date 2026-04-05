Pod::Spec.new do |s|
  s.name = 'CapacitorAppReview'
  s.version = '1.0.0'
  s.summary = 'Capacitor plugin to request App Store reviews'
  s.license = 'MIT'
  s.homepage = 'https://github.com/example/capacitor-app-review'
  s.authors = { 'HabitBuilder' => 'dev@example.com' }
  s.source = { :path => '.' }
  s.source_files = 'ios/Sources/**/*.{swift,h,m}'
  s.ios.deployment_target  = '14.0'
  s.dependency 'Capacitor'
  s.swift_version = '5.1'
end
