import urllib.request
import urllib.error

req = urllib.request.Request('https://trip-cancellation-and-refund-policy.onrender.com/api/me', method='PUT')
try:
    urllib.request.urlopen(req)
except urllib.error.HTTPError as e:
    print("HTTP Error:", e.code)
    print("Headers:", e.headers)
except Exception as e:
    print("Exception:", e)
