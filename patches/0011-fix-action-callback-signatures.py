from pathlib import Path


def replace_once(relative_path, old, new):
    path = Path(relative_path)
    source = path.read_text()
    matches = source.count(old)
    if matches != 1:
        raise RuntimeError(f"{path}: expected one anchor, found {matches}: {old!r}")
    path.write_text(source.replace(old, new, 1))


replace_once(
    "src/doom/p_mobj.c",
    "\tif (st->action.acp3)\n"
    "\t    st->action.acp3(mobj, NULL, NULL); "
    "// [crispy] let pspr action pointers get called from mobj states",
    "\tif (st->action.acp1)\n\t    st->action.acp1(mobj);",
)

replace_once(
    "src/doom/info.c",
    '#include "p_mobj.h"\n',
    '#include "p_mobj.h"\n#include "d_player.h"\n',
)

old_declarations = """// Doesn't work with g++, needs actionf_p1
void  A_Light0();
void A_WeaponReady();
void A_Lower();
void A_Raise();
void A_Punch();
void A_ReFire();
void A_FirePistol();
void A_Light1();
void A_FireShotgun();
void A_Light2();
void A_FireShotgun2();
void A_CheckReload();
void A_OpenShotgun2();
void A_LoadShotgun2();
void A_CloseShotgun2();
void A_FireCGun();
void A_GunFlash();
void A_FireMissile();
void A_Saw();
void A_FirePlasma();
void A_BFGsound();
void A_FireBFG();
void A_BFGSpray();
void A_Explode();
void A_Pain();
void A_PlayerScream();
void A_Fall();
void A_XScream();
void A_Look();
void A_Chase();
void A_FaceTarget();
void A_PosAttack();
void A_Scream();
void A_SPosAttack();
void A_VileChase();
void A_VileStart();
void A_VileTarget();
void A_VileAttack();
void A_StartFire();
void A_Fire();
void A_FireCrackle();
void A_Tracer();
void A_SkelWhoosh();
void A_SkelFist();
void A_SkelMissile();
void A_FatRaise();
void A_FatAttack1();
void A_FatAttack2();
void A_FatAttack3();
void A_BossDeath();
void A_CPosAttack();
void A_CPosRefire();
void A_TroopAttack();
void A_SargAttack();
void A_HeadAttack();
void A_BruisAttack();
void A_SkullAttack();
void A_Metal();
void A_SpidRefire();
void A_BabyMetal();
void A_BspiAttack();
void A_Hoof();
void A_CyberAttack();
void A_PainAttack();
void A_PainDie();
void A_KeenDie();
void A_BrainPain();
void A_BrainScream();
void A_BrainDie();
void A_BrainAwake();
void A_BrainSpit();
void A_SpawnSound();
void A_SpawnFly();
void A_BrainExplode();
// [crispy] additional BOOM and MBF states, sprites and code pointers
void A_Stop();
void A_Die();
void A_FireOldBFG();
void A_Detonate();
void A_Mushroom();
void A_BetaSkullAttack();
"""

psprite = "mobj_t *, player_t *, pspdef_t *"
mobjs = "mobj_t *"
psprite_actions = {
    "A_Light0", "A_WeaponReady", "A_Lower", "A_Raise", "A_Punch",
    "A_ReFire", "A_FirePistol", "A_Light1", "A_FireShotgun", "A_Light2",
    "A_FireShotgun2", "A_CheckReload", "A_OpenShotgun2", "A_LoadShotgun2",
    "A_CloseShotgun2", "A_FireCGun", "A_GunFlash", "A_FireMissile", "A_Saw",
    "A_FirePlasma", "A_BFGsound", "A_FireBFG", "A_FireOldBFG",
}
names = [
    line.split()[1].split("(")[0]
    for line in old_declarations.splitlines()
    if line.startswith("void ")
]
new_declarations = "".join(
    f"void {name}({psprite if name in psprite_actions else mobjs});\n"
    for name in names
)
replace_once("src/doom/info.c", old_declarations, new_declarations)
